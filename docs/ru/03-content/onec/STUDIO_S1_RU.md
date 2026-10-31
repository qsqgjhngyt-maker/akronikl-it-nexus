# Первый этап поддержки 1С в Studio

**STATUS: PASS в согласованном объёме S1. IMPLEMENTED / AUTOMATED PASS.** Редактор, сохранение, отдельные копии, контрольные точки и экспорт подключены в существующий Project Studio. Полный продукт остаётся PARTIAL / NOT PUBLISHED. Проверки интерфейса выполнены на синтетическом аккаунте и хранилище; LIVE приёмка с реальной серверной сессией не заявляется.

Владелец 31.10.2026 прямо согласовал: «Согласовываю первый этап Studio: редактор, сохранение, копии и экспорт. Реализуй в том же PR #63 одним потоком, сохрани работы и прогресс, проверь регрессии. Main и production не менять, merge не выполнять». Это разрешение реализации S1 в единственном [Draft PR #63](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/63). Оно не означает проведение независимого review другими ветками и не разрешает S2, merge или публикацию.

Предыдущие [proposal](STUDIO_INTEGRATION_PROPOSAL_RU.md), CONTRACT_DRAFT.json и акт A2/P2 сохраняются как история. Их формулировка PLANNED относится к моменту до этого решения. Актуальные поля реализации — [STUDIO_S1_CONTRACT.json](studio-s1/STUDIO_S1_CONTRACT.json).

## Доступные действия

У уроков A2/P2 появилась ссылка на рабочие копии в Studio. Она передаёт прежние Course ID и Topic ID. В Project Studio ученик выбирает курс и урок, видит ревизии и состав из девяти файлов, затем явно создаёт новую работу. Повторное создание всегда получает новый ID; команда «Продолжить» открывает существующую работу.

Studio использует прежний Code Studio с поиском, историей редактирования и переключением файлов. Поддерживаются `.bsl` и `.os`; текстовые XML, JSON и документация входят в переносимый комплект. Полный контекст конфигурации `0.2.0-a2p2` загружается с проверкой девяти SHA256. Редактируемый entry задан явно — `Ext/ManagedApplicationModule.bsl`; C++ entry/build plan не подставляется. Все материалы «Учебной сервисной службы» оригинальные, данные синтетические.

Автосохранение и явное сохранение используют существующий account-private Project Store. Новый ID создаётся через UUID, новый проект записывается с готовым `export-only` профилем за одну запись базы проектов. Владелец и ACL формируются прежним механизмом текущего проверенного аккаунта. Новый код не создаёт серверную сессию, не подменяет владельца и не включает Cloud Sync. Без аккаунта доступны курс и автономный комплект; создание личной работы требует штатного входа.

«Новая отдельная копия» сохраняет sourceProjectId, sourceCourseId, sourceRevision и `credit=none`. Можно явно выбрать другой курс; его binding берётся из существующего A2/P2 curriculum. Attempts и completion не копируются. Контрольная точка содержит снимок workspace; открытие точки создаёт новую работу и сохраняет текущую. Автоматического restore поверх источника нет.

XML шаблона защищены от изменения в текущей копии. Для эксперимента ученик явно создаёт ещё одну копию с разрешением редактирования metadata. Проверка сохранения отклоняет изменение или удаление защищённого файла даже при обходе элемента интерфейса. C++ demo, встроенное переименование и удаление файлов скрыты для S1; новый BSL/OS файл проходит строгую проверку до добавления.

Экспорт скачивает `nexus-onec-sources.json`: переносимый текстовый пакет с исходниками, entry и активным файлом. Импорт этого пакета создаёт новую работу. ID, owner, ACL, session, Cloud config, origin, checkpoints и progress из импортированного объекта не принимаются. Пакет JSON не является выгрузкой `.dt` или автоматически загружаемой конфигурацией 1С. Нативная сборка/запуск остаются отдельной практикой по ссылке из редактора.

При quota/error интерфейс не сообщает «Сохранено»: несохранённый код остаётся открытым и доступен для экспорта. Повреждённая JSON база проектов отклоняется до записи; fallback старого store не используется для замены повреждения пустой базой. Старые проекты и прогресс не очищаются.

## Границы исполнения и доступа

Кнопка запуска сообщает, что BSL не выполнялся, и направляет к нативной инструкции. Provider 1С, JS эмуляция, local listener, backend и серверное оценивание не добавлены. OneScript и BSL LS не объявляются подключёнными. `.os` доступен для редактирования; совместимость заданий с отдельным исполнителем требует доказательств S2.

Каждая операция проверяет текущий аккаунт, владение, local-only профиль и разрешения ACL для проекта и файлов; явный DENY имеет приоритет. Блокировка контекста закрывает доступ к прежней работе. Импорт сохраняет прежние лимиты Studio: 64 файла, 262144 bytes/file, 1048576 bytes текста, 2097152 bytes JSON. Отклоняются traversal, absolute/Windows paths, некорректный UTF-8, NUL, опасные prototype names, duplicate, file/directory conflicts, двоичные расширения и XML DOCTYPE/ENTITY. XML остаётся текстом, внешние сущности не загружаются.

Финальный ACL review дополнительно проверяет все входящие пути workspace, включая новые несохранённые файлы: DENY на папку блокирует их сохранение, копирование и экспорт до записи. Отрицательные cases включены в S1 unit suite.

Из действующего Studio изменён только `project-studio/project-studio.js`: lazy входы в S1 launcher/editor и отдельная onec ветка без C++ runtime. Store, transfer, build, sandbox/code-studio, runtime-router, Identity, OAuth, BFF, Worker/D1 и PWA contracts побайтно сохранены. Реализация S1 лежит в `courses/onec-education/studio*.mjs/css/json`. Статус языка в общем каталоге остаётся planned; S1 явно обозначает доступность редактора отдельно от исполнения.

## Проверки и evidence

| Проверка | Доказанный результат |
| --- | --- |
| S1 unit | 15/15: account gate, сохранение/reopen, readonly, copies/checkpoints, stripping, paths/XML/UTF-8/limits, quota, DENY, bindings, повреждённая база, старый C++/прогресс, CI pin negatives, lock |
| Общий regression | 26/26 групп, включая CP-1.1, прежние 60 unit checks, C++, Code/Project Studio, Cloud/PWA, native source/evidence integrity и preservation |
| Прежний browser suite | 15/15 групп; 34 локализации на 1366/390/375/320, attempts/provenance/reload, холодный offline |
| S1 browser suite | 11/11: полный шаблон и общий редактор, autosave/reload, readonly, copies/checkpoints, export/OS, quota с экспортом несохранённого кода, lock, настоящий lazy hook/EN, import/cross-course copy, 390/375/320 |
| NEXUS-PERF-01 | Прежний startup graph: 79 модулей / 629956 bytes, cap 80/640000; S1 загружается при открытии Studio |
| Native A2/P2 | Исходники и runner не менялись; прежние 46 cases и local desktop evidence сохранены. Новый запуск 1С за S1 не выдаётся |

Всего 75 unit checks и 26 browser groups. Копии на синтетическом аккаунте реально записывались в прежний account store и читались после reload. Браузерный fixture не включён в продукт: HTML создаёт только локальный тестовый сервер, MemoryStorage/DTO не устанавливаются рабочими S1 модулями.

Для уже открытого S1 отдельно проверено сохранение при отключённой сети. Холодный offline относится к автономному курсу; первый запуск S1 без сети и кэширование личных работ в PWA не объявлены реализованными. Мобильная кнопка «Файлы» подключена после lazy mount и проверена на 390/375/320.

Безопасные отчёты, журнал регрессий, снимки и SHA256 — [studio-s1](studio-s1). Исходная база review — `850d6aabf26fe05a33fac165310027321060a45f`. Текущие commit/tree, CI runs и Actions artifacts фиксируются в PR metadata после проверки HEAD. Прежний принятый архив A2/P2 сохраняется; новый offline build имеет свой MANIFEST и не заменяет исторический пакет.

## CI и историческая публикация

Прямое решение владельца разрешает точный S1 hook, но не произвольное изменение Studio. CI_ROUTING_SCOPE обновлён до 18 точных paths/modes/SHA256, включая S1 modules/tests, hook и изменённые regression/preservation checks. Предыдущий scope сохранён отдельным файлом и в исходном SHA. Классификатор и historical publication job не менялись; release eligibility остаётся false.

Новый trusted bootstrap содержит проверенные исходники и scope. Следующий коммит меняет только pin на его конкретный SHA. Workflow использует доверенный router/scope, не самозаявленный allowlist PR. Изменение pinned bytes/mode отвергается; Store/Auth/runtime/PWA/release вне разрешённого scope остаются в strict historical lane. Receipt/allowlist/admission P4-Q, commands и permissions не ослаблены. Main required-check settings и административная политика не менялись.

## Неудачные проверки и исправления

| Проблема | Попытка и результат | Решение и regression |
| --- | --- | --- |
| Зависимость браузера ещё устанавливалась | Первый launch не нашёл headless shell | После завершения установки запуск выполнен; suites PASS |
| Тестовый HTTP root содержал лишний разделитель | Module 404 и timeout fixture | Нормализован root; чтение файла до writeHead; suites PASS |
| В тестовом fixture была ссылка на отсутствующий generated CSS | На узком экране обнаружено переполнение | Использованы настоящие source styles, добавлен scoped mobile layout; 390/375/320 PASS |
| У лабораторной после S1 две ссылки | Старый строгий selector ожидал один anchor | Проверка нативной инструкции выбрана явно; новые Studio сценарии проверяются отдельно; все 15 прежних groups PASS |
| Старый CI scope не включал S1 | Preservation отклонил утверждённый hook | Точный owner-approved scope, отрицательные проверки bytes/mode и запрещённых contracts; 26 regression PASS |

## Что остаётся

S2 execution/bridge, автоматический перенос native результатов, защищённое оценивание и Academy/Account progress adapter остаются PLANNED. `codeVerifiedServer=false`, `credentialEligible=false`; S1 не выставляет completion. Полные EULA/license profile/training build, независимый security/предметный/педагогический review, реальная серверная сессия с ручным S1 smoke, физические Android/iPhone, WebKit/assistive technology и field p95 не закрываются синтетическими тестами.

Main остаётся `d8721e06a2b1ac953aa18694c07559c62d388700`. Production, merge и официальный Release не выполнялись. PR #63 остаётся единственным Draft candidate; A3/P3 независимо не начинались.

## Передача результата

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03/02/05, один рабочий поток PR #63. Результат/milestone: S1 IMPLEMENTED / AUTOMATED PASS в разрешённом объёме. Куда: 00 MASTER → 05 evidence → 02/01/07 для review кандидата; 04 — архитектура и тестовые ограничения. 06 сейчас не требуется.

Почему: подключён новый профиль к существующему Studio; нужно проверить решение перед интеграцией/публикацией. Когда: после CI текущего HEAD, до следующего крупного этапа. Что передать: этот отчёт, STUDIO_S1_CONTRACT.json, S1 scope и evidence matrix.

Готовый текст для вставки: «S1 согласован владельцем 31.10.2026 и реализован одним исполнителем в #63: общий Code Studio для .bsl/.os, прежнее account-private сохранение, новые ID/provenance, копии между A/P без credit, checkpoint как новая работа и безопасный JSON source export/import. Старые работы/attempts/progress сохранены. 75 unit, 26 regression, 15+11 browser groups локально PASS; startup 79/629956 прежний. Native execution не подключено; ложный runtime PASS отсутствует. Точный S1 scope закреплён trusted SHA; исторические release gates сохранены. Реальная серверная сессия/physical mobile/WebKit/p95 и независимый review остаются. CI текущего HEAD — в PR metadata. Main/production/merge/Release не выполнялись. Следующий приоритет — review S1 и отдельное решение о native S2; A3/P3 продолжать одним потоком».

Что потом: предъявить S1 на review 02/01/07/05; S2 не начинать без отдельного решения. Есть ли здесь материал для диплома? Да: совместимость языкового профиля с C++ contracts, copy provenance без зачёта, отказ от записи поверх повреждения, trust boundaries native evidence и точный CI scope. Измеренный педагогический эффект не заявляется.

**WHAT WAS PROVED:** S1 и сохранность в автоматической матрице. **WHAT REMAINS:** LIVE/independent review и S2. **ROUTING CHECK:** 00/05/02/01/07/04. **NEXT RECOMMENDED BRANCH:** 02/05. **RECOMMENDED MODE:** Высокий; runtime/security/licensing — Очень высокий.
