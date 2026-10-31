# Согласование поддержки 1С в Studio

**STATUS: PLANNED. Решение требуется от 02, 01, 07 и 00 до изменения contracts.** Предлагается сначала подключить редактирование и сохранение учебных копий 1С в Studio. Настоящее исполнение подключается отдельным этапом после проверки лицензирования и границ безопасности. A2/P2 уже имеют [акт scoped приёмки](ACCEPTANCE_A2P2_RU.md); интеграция Studio в этот акт не входит.

Предмет согласования S1 — создание отдельного проекта из урока, редактирование `.bsl`/`.os`, autosave, checkpoint, копирование с provenance и экспорт текстовых исходников. S2 — запуск проверок в отдельной официальной или доказанно совместимой среде. Схема [studio-agreement/CONTRACT_DRAFT.json](studio-agreement/CONTRACT_DRAFT.json) является предложением и не загружается действующим приложением.

## Текущие границы кода

Аудит выполнен на `edc59ced8510f527fab67c5f070f7192fbcad6d9`. Точные SHA256 файлов и выводы находятся в [acceptance-a2p2/SOURCE_AUDIT.json](acceptance-a2p2/SOURCE_AUDIT.json).

| Узел | Текущее поведение | Необходимое решение |
| --- | --- | --- |
| `sandbox/languages.js` | `onec`, aliases `1c,bsl`, `.bsl/.os`, entry `Module.bsl` уже объявлены; status planned | Отделить доступность редактора от доступности исполнения; не объявлять готовый runtime по одной подсветке |
| `project-studio/project-store.js` | DB schema 2, account storage, owner/ACL, audit и очередь sync; создание по умолчанию C++/wasm-debug | Явный профиль 1С и режим local-only; не создавать владельца и не обходить действующее правило account-private |
| `project-studio/project-store.js` | `ensureTemplateProject` возвращает существующий templateKey; checkpoint restore переписывает workspace и progress | Resume открывает прежнюю работу; действие «Новая копия» создаёт новый ID. Учебный переход не вызывает restore существующей работы |
| `project-studio/project-transfer.js` | Импорт/экспорт валидирует только C++, строгие пути, 64 файла, 256 KiB/file, 1 MiB text, 2 MiB JSON | Отдельный allowlist для 1С при прежних лимитах; запрет traversal, duplicate, конфликтов, NUL и некорректного UTF-8 сохраняется |
| `project-studio/project-build.js` | Translation units и defaults рассчитаны на C/C++ | S1 не вызывает C++ build plan для BSL. `.bsl` — контекстный модуль, не самостоятельный C++ target |
| `sandbox/provider-contract.js` | Generic request/result; entry без явного значения становится main.cpp | Для будущего onec запроса entry и execution kind обязательны; aliases нормализуются через language registry |
| `sandbox/runtime-router.js` | Требует compatible и available provider | S1 provider не регистрирует. Run показывает отсутствие среды; успех модели не становится runtimeResult |
| `sandbox/code-workspace.js` и `sandbox/virtual-files.js` | Редакторская VFS нормализует пути | Внешний ввод сначала проходит строгую валидацию; normalizer не заменяет границу импорта |
| `courses/onec-education/model.mjs` | Локальные раздельные course keys, revision-aware attempts и completion, копия без credit | Не мигрировать storage автоматически в account и не превращать импортированный отчёт в зачёт |

## Предлагаемый этап S1

Ученик открывает A2 или P2 и выбирает «Создать рабочую копию». Перед созданием Studio показывает курс, тему, ревизию и состав файлов. Уже существующая работа доступна отдельной командой «Продолжить». Повторное создание получает новый project ID; templateKey служит происхождению, а не разрешению перезаписать работу.

Проект профессионального курса сохраняет `courseId=onec`, прикладного — `courseId=1c-enterprise`; у обоих `languageId=onec`. Topic ID берётся из существующего curriculum, revision — из выбранного урока. У P2 редактируемый модуль — `Ext/ManagedApplicationModule.bsl` с полным контекстом конфигурации `0.2.0-a2p2`, entry задан явно. Фрагменты `examples-a2p2` помечаются как фрагменты и не предлагаются как самостоятельный запуск. `.os` редактируется как отдельный script kind; совпадение расширения не доказывает совместимость OneScript с metadata API 1С.

Текстовый комплект конфигурации включает `.xml`, `.bsl`, документацию и JSON passport. Канонические metadata шаблона readOnly; для эксперимента с metadata создаётся новая копия. Импортированный XML остаётся текстом: нет загрузки внешних сущностей, HTML-вставки или исполнения. Секреты, базы `.1CD`, `.dt`, лицензии, двоичные обработки и произвольные исполняемые файлы не входят в S1 import/export. Шаблон S1 не используется с прежним C++ portable build manifest.

Работы сохраняются через действующий account-private store после явной проверки доступности аккаунта. Если он недоступен, создание проекта сообщает причину и предлагает автономный комплект; поддельный owner и обход ACL не добавляются. Чтение старых candidate progress keys не запускает запись/миграцию. Ошибка quota не показывает «Сохранено». Checkpoint новой работы фиксирует workspace revision; сохранённые attempts и завершение другого курса не меняются.

Копирование переносит только выбранные текстовые исходники и происхождение `sourceProjectId`, `sourceCourseId`, `sourceRevision`, `credit=none`. Новые owner/ACL задаются действующим механизмом текущего пользователя; импортированный owner/ACL/id/session/sync не принимается. Локальный оригинал и его история остаются. Между A и P не переносится completion. Потерянная исходная работа не восстанавливается автоматически поверх другой работы с похожим названием.

S1 использует локальный режим `mode=local-only, provider=none`. Наличие local-only в sync не означает автоматическое включение содержимого в offline/PWA cache: это требует отдельного review 01/07. Основной startup не импортирует BSL LS/EDT/metadata/полный курс. Материалы загружаются по переходу, с прежним NEXUS-PERF-01 и offline budget.

## Предлагаемый этап S2

Рекомендуемый следующий путь — явный экспорт копии и запуск в собственной официальной 1С с runner, выбирающим только новый каталог. Уже принятый runner не становится исполнителем произвольного кода из браузера: для изменённых работ нужны отдельные правила сборки, проверки и изоляции. Linux Actions не имитирует лицензионный runtime.

Автоматический local bridge, сетевой endpoint, новый backend, Cloud runner и универсальное исполнение чужого BSL не входят в S1. Для bridge отдельное решение должно определить выбранный runtime/build/license, execution account, allowlist конфигурации и команд, изоляцию файловой системы/сети, resource limits/cancel/timeout, очистку только собственных временных копий и доверие результату. Произвольный BSL может обращаться к ресурсам машины; новый каталог сам по себе не является изоляцией процесса. Нельзя открыть listener на localhost, добавить wildcard CORS, передать путь к произвольной базе или принять shell command из проекта без такого решения.

Источник native evidence связывается с `workId`, новой `runId`, `sourceHash`, `configurationHash`, `contentRevision`, точным runtime build и упорядоченным набором test IDs. Если отчёт не соответствует исходникам/ревизии или содержит неизвестные ID, он отклоняется. Ошибка, timeout, unavailable и ограничение лицензии сохраняются отдельно от assertion failure. Копирование отчёта не присваивает ему новое авторство.

Импорт локального отчёта считается `local-report-untrusted`: это полезное свидетельство для ученика/ревьюера, но его можно изменить вручную. `codeVerifiedServer=false` и `credentialEligible=false` сохраняются. Подписание или защищённое серверное оценивание требует отдельного контракта и не возникает от наличия SHA256. OneScript может получить свой runtime kind только после проверки совместимости каждого задания; BSL LS остаётся статическим анализом, EDT — средством разработки.

## Решения для согласования

| Владелец ветки | Конкретное решение | Условие готовности |
| --- | --- | --- |
| 02 Studio | Принять S1 scope и отдельный onec profile; раздельные commands resume/new-copy; запрет C++ fallback | Согласованы manifest fields, import dispatch и работа checkpoint; существующие C++ проекты и экспорт проходят regression |
| 01 Security | Подтвердить использование прежнего account-private store/local-only без новых auth или sync transport | Проверены ACL/import stripping, quota/error, отсутствие сети/секретов и пользовательских баз. S2 отдельным решением |
| 03 Content | Утвердить binding существующих IDs/revisions и полный metadata контекст P2 | Каждый template имеет source hashes и copy provenance; native result не ставит completion автоматически |
| 07 UI/mobile | Утвердить подписи editor/model/native, состояния save/unavailable и lazy/offline поведение | Keyboard, 320/375/390, физические устройства/WebKit, quota и холодный offline проверены в согласованном объёме |
| 05 Evidence | Принять матрицу ниже и привязку source/CI/артефактов | Публичные логи безопасны; release admission остаётся отдельным |
| 00 MASTER | Разрешить реализацию только S1 одним исполнителем в #63 | Зафиксирован scope; main/production/merge не включены в решение |

Это предложение не означает согласие перечисленных веток. Текущая задача пользователя разрешает подготовку согласования; изменение Studio contracts начнётся после решения.

## Матрица приёмки S1

1. Открытие старого C++ проекта, run/tests/export/import и restore сохраняют прежнее поведение; source/progress/owner/ACL не изменяются при просмотре шаблона 1С.
2. A/P создают независимые проекты с существующим Topic ID и явным onec entry. Новый template не перезаписывает предыдущую копию; reopen сохраняет файлы, revision и origin.
3. Autosave/quota, checkpoint, resume и new-copy проверяются на отдельных fixture accounts/storage, без пользовательских баз. Переключение аккаунта не раскрывает чужой проект.
4. Импорт отклоняет traversal, absolute/Windows paths, duplicate, file/directory conflicts, prototype names, невалидный UTF-8, XML external entities, binary и превышение прежних лимитов. Положительный комплект 1С проходит; C++ allowlist не расширяется молча.
5. Run для S1 доступно объясняет отсутствие исполнителя. `.os`, `.bsl`, подсветка, схема и самоотчёт не получают ложный PASS настоящей 1С.
6. A1/P1/A2/P2 progress/attempts не очищаются и не мигрируют при открытии Studio. Копия между курсами сохраняет provenance и не переносит credit.
7. Прежний startup cap 80 modules/640000 source bytes и NEXUS-PERF-01 сохранены. Lazy/offline cache проходит 01/07 review; физические mobile/WebKit и field p95 не заменяются Chromium emulation.

## Передача предложения

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03/05, PR #63. Результат/milestone: A2/P2 scoped PASS и конкретный S1/S2 proposal. Куда: 02 → 01 → 07 → 00, копия 05/04. Почему: действующий store/import/build/runtime относится к другим веткам. Когда: сейчас, до изменения contracts.

Что передать: это предложение, CONTRACT_DRAFT.json, SOURCE_AUDIT.json и ACCEPTANCE_A2P2_RU.md.

Готовый текст для вставки: «Прошу согласовать реализацию S1 поддержки 1С в Studio в том же #63 одним исполнителем. Scope: explicit onec profile, редактор текстовых .bsl/.os/XML, local-only account-private сохранение через прежний ACL, resume/new-copy, checkpoints и безопасный экспорт при прежних import limits. Course IDs onec/1c-enterprise, старые Topic IDs/attempts/provenance сохраняются, копия без credit. Для BSL не вызывается C++ build plan и не регистрируется fake runtime. S2 execution bridge/Cloud/server grading, auth/sync transport и production не входят. Они требуют самостоятельного licensing/security решения. Матрица regression, runtime boundaries и поля происхождения приложены. Требуются решения 02 по manifest/import/build, 01 по private/security, 07 по UX/lazy/offline и 00 по scope. До согласования статус PLANNED».

Что потом: зафиксировать решения в этом proposal/PR, реализовать только согласованный S1 в одном потоке, затем предъявить его отдельную evidence матрицу.

Есть ли здесь материал для диплома? Да: разделение редактора и runtime, trust local evidence, совместимость C++ contracts и копирование без неявного переноса учебного результата. Альтернатива JS execution отклонена из-за несоответствия семантике 1С; универсальный bridge отложен до доказанной изоляции и лицензирования.

**WHAT WAS PROVED:** текущие границы прочитаны и хешированы; S1/S2 и критерии подготовлены. **WHAT REMAINS:** решения владельцев веток и реализация. **ROUTING CHECK:** 02/01/07/00, 05/04. **NEXT RECOMMENDED BRANCH:** 02. **RECOMMENDED MODE:** Высокий; runtime/security/licensing — Очень высокий.
