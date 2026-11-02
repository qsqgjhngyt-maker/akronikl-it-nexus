# 1С Studio S1 — review 03/05 и подготовка S2, 31.10.2026

STATUS: **PARTIAL** для общей интеграционной приёмки. Исправления в пределах S1 — **IMPLEMENTED / AUTOMATED PASS**. S2 — **PLANNED / требуется отдельное согласование**. Единственный кандидат — Draft PR #63, `feature/onec-dual-gold-foundation-20261030`. Main/production/merge/Release не выполняются.

Вход review: `e0d28c3bf86b572cdc04acfddaf471cc5b3b71ff`, main baseline `d8721e06a2b1ac953aa18694c07559c62d388700`. Этот акт дополняет исторический [S1](STUDIO_S1_RU.md), не переписывая его evidence. Финальные SHA, CI run/job/artifact/digest фиксируются в описании PR после публикации проверенного дерева; локальная проверка сама по себе не доказывает CI нового HEAD.

## Что проверено и исправлено

| ID | Воспроизводимая проблема | Решение и проверка | Статус |
| --- | --- | --- | --- |
| S1-R01 | Старая вкладка сохраняла весь прежний snapshot и стирала новое содержимое другого файла | Save/checkpoint требуют `expectedLocalRevision`; при несовпадении отказ до записи. UI сохраняет несохранённый код открытым; экспорт и новая rescue copy доступны. Отдельно записаны базовая ревизия snapshot и наблюдавшаяся текущая ревизия источника | IMPLEMENTED / AUTOMATED PASS |
| S1-R02 | Общий store нормализовал пустую соседнюю запись `{}` и записывал её обратно при чтении | Вход S1 проверяет согласованность ключа/id/title всех записей до вызова legacy store. Невалидные данные блокируют S1 без автоматического ремонта. Публичные legacy-вызовы вне S1 остаются отдельным риском ниже | IMPLEMENTED / AUTOMATED PASS в S1 |
| S1-R03 | Lone surrogate UTF-16 принимался как текст, а при последующем UTF-8 кодировании мог замениться | Well-formed Unicode проверяется в названии, пути и содержимом. Валидные emoji сохраняются. Проверяется фактическая длина import ArrayBuffer, лимиты отдельного файла и суммы | IMPLEMENTED / AUTOMATED PASS |
| S1-R04 | Save мог принять snapshot без прежнего редактируемого файла | Удаление существующих файлов через S1 save отклоняется. Экспериментальная отдельная копия может содержать иной набор, источник остаётся | IMPLEMENTED / AUTOMATED PASS |
| S1-R05 | Две вкладки S1 могли одновременно писать в общий account DB | Account-wide Web Lock держится на время открытого редактора; вторая вкладка ожидает в read-only. Launcher create/import используют короткий тот же lock. При закрытии/навигации lock освобождается; без Web Locks запись блокируется без небезопасного fallback | IMPLEMENTED / AUTOMATED PASS для согласованных S1 writers |

Воспроизведение до исправления — [BEFORE_REPRODUCTION.json](studio-review-20261031/evidence/BEFORE_REPRODUCTION.json). Восемь новых unit checks — `tests/onec-studio-review.test.mjs`; browser conflict/export/rescue, две вкладки и сохранность attempts/provenance добавлены в существующий S1 browser suite. Все данные этих проверок синтетические. Продукт не получает тестовый login.

Web Locks согласовывают только участвующие вкладки одного origin. Это browser coordination, а не серверная авторизация; другой origin и старый writer не становятся участниками автоматически. [Описание Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).

## Сохранность и границы безопасности

- Сохраняются Course ID `onec`/`1c-enterprise`, все 84 Topic ID и порядок; schema 2 и account namespace прежние. Старые C++ проекты, course progress, attempts и provenance проверены на синтетических fixtures. Course progress до/после S1 create/edit/checkpoint/copy сравнивается побайтно. Зачёт в другую траекторию не переносится.
- Новая работа/копия/checkpoint copy получают новый ID. Источник не восстанавливается поверх себя. У rescue copy указаны `sourceSnapshotBaseLocalRevision` и `sourceObservedLocalRevision`, чтобы устаревший snapshot не выдавался за актуальное сохранение.
- Owner/ACL проверяются для сохранённых и новых несохранённых путей до save/copy/export; locked account не сохраняет и не экспортирует. Import не принимает чужие id/owner/ACL/progress/sync; пути, UTF-8, XML entities и размеры проверяются. Это защита клиентского потока, не защита от владельца своего браузера/изменённых локальных данных.
- При quota/conflict не показывается ложное успешное сохранение; редактор остаётся с кодом для экспорта. Source export — перенос текстов, не полный backup истории/checkpoints/Account. Для переноса checkpoint его нужно открыть новой копией и экспортировать. Локальные данные зависят от сохранности browser profile; Cloud backup в S1 не реализован.
- S1 не добавляет listener, native provider, subprocess или выполнение BSL. Run сообщает, что код не выполнялся. Нет JS-эмуляции, автоматического native credit, server verification или credential eligibility.
- Общие `project-store.js`, transfer/build, Code Studio, runtime-router, Identity/OAuth/BFF/Worker/D1/PWA не изменены. В существующем `project-studio.js` уточнено освобождение S1 controller при навигации. Новые изменения находятся в прежнем S1 потоке; третий PR не создавался.

## Открытое существенное замечание: общий Project Store

**S1-R06 / P1 / требуется решение 02 и 00.** Legacy store хранит account DB единым JSON и имеет публичные `loadProjectDb`/`saveProjectDb` без общей транзакции. Два read/modify/write snapshot могут потерять более новую запись; старые C++/Cloud writers не используют новый S1 lock. Это детерминированно воспроизведено публичными API в MemoryStorage: [LEGACY_WRITER_RISK.json](studio-review-20261031/evidence/LEGACY_WRITER_RISK.json), [скрипт воспроизведения](studio-review-20261031/evidence/review-legacy-writers.mjs). Это модель interleaving, не наблюдение потери пользовательских данных на production.

Кроме того, общий `listProjects/getProject` может выполнить migration раньше входа в S1. Новый S1 preflight не исправляет эти чужие пути. Нельзя объявить всю платформу защищённой от конкурентной записи или восстановления повреждений на основании S1 tests. Браузерный тест двух вкладок использует общий origin/Web Locks и отдельные синтетические session fixtures; shared snapshot conflict дополнительно проверен unit-тестом.

**Предлагаемое решение для согласования:** 02 вводит одну транзакционную точку записи для всех writers account DB (либо согласованную блокировку всех legacy writers), с сохранением существующих ID/ACL/progress и резервной копией до любой migration. Нужны tests C++/1С/Cloud interleaving, повреждённый sibling, quota/crash/account switch, версия схемы/rollback. Не выполнять молчаливую migration, автоматическую очистку или изменение sync/Identity contract в content review. До решения — отдельный merge/integration gate; S1 только scoped AUTOMATED PASS.

## Evidence и регрессии

Локально: **27/27 regression groups, 83/83 unit checks**, включая 8 новых review checks, 15 S1 и 60 прежних. **29/29 browser groups**: 15 курса +14 S1. Все 34 RU/EN тела, ширины 1366/390/375/320; cold offline курса, warm offline S1, autosave/reload/import/export, ACL/lock/quota, copies/checkpoints, no-credit, stale revision, writer lease и attempts/provenance. Итоги/логи: [пакет review](studio-review-20261031/evidence), [SHA256](studio-review-20261031/SHA256.json).

NEXUS-PERF-01 остаётся **79 modules /629956 bytes**, предел 80/640000; S1 lazy. Field p95 не измерен. Native kit A2/P2, исходные уроки, offline HTML и прежний ZIP не менялись. Предыдущие нативные результаты на официальной 1С 8.3.27.2214 остаются историческим доказательством A2/P2, а не запуском S2 или изолированного произвольного кода. Новый native запуск в этом review не выполнялся.

CI использует exact 20 pinned paths/modes/hashes вместо 18 (добавлены writer module и review suite); прежний scope сохранён отдельно. Router и исторический P4-Q publication job не переписаны, admission/receipts/allowlist сохранены; `releaseEligible=false`. Обновление trusted pin фиксирует точные проверенные байты S1, не разрешает arbitrary protected/runtime/auth changes. Текущее подтверждение исторических gates — preservation/routing tests и итоговый job status; required-check settings main административно не проверены.

Не заявлены: LIVE S1 с реальной серверной сессией, физические Android/iPhone, WebKit, assistive/manual UX, независимый security/педагогический review, field p95, эффект обучения и авторство ученика. Глубина дальнейшего курса остаётся PLANNED вне принятых A1–A2/P1–P2.

## S2 и маршрутизация

Конкретное согласование подготовлено: [STUDIO_S2_APPROVAL_RU.md](STUDIO_S2_APPROVAL_RU.md). Рекомендуемый первый объём — S2-0: права, изоляция и native feasibility; затем S2-A — изолированный официальный запуск отдельной копии с ограниченным результатом. Автоматическая кнопка/локальный bridge — последующее отдельное решение S2-B. Сейчас runtime/Project Studio execution/Identity contracts не меняются.

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03 CONTENT PRODUCTION /05 review. Результат: исправлены пять групп S1-defects, подготовлено S2; общий store R06 остаётся gate. Куда: **00 →02/01 →05/07 →04**. Почему: транзакционность общего хранилища и native trust boundary выходят за content. Когда: сейчас, до реализации S2/следующего крупного этапа. Передать готовый текст:

> MASTER 00 /02 /01 /05 /07 /04. PR #63 остаётся единственным Draft candidate, без merge/main/production. Review S1: stale snapshot CAS, strict malformed-store preflight, Unicode/actual import size, запрет потери файлов и account Web Lock реализованы; локально 27 regression groups, 83 unit checks, 29 browser groups PASS. Course IDs/84 Topic IDs/attempts/provenance/C++ contracts сохраняются. S1-R06 P1: общий legacy Project Store не транзакционен и не принимает S1 lock; interleaving и migration-before-preflight остаются. Нужен согласованный общий writer/transaction gate 02 с 01/05 до полной приёмки. S2 только PLANNED: предложены S2-0 rights/isolation/native feasibility, S2-A disposable official 1С run на новой копии, S2-B bridge отдельно. Учебная 8.3.27.1508 опубликована официально, полный EULA/VM/unattended entitlement и изоляция пока не доказаны. `codeVerifiedServer=false`, `credentialEligible=false`; main/production/merge/Release не выполнялись. Финальные HEAD/CI/artifact hashes — в описании PR и evidence. Требуются решения 00/02/01, не независимая параллельная реализация.

Что потом: вернуться в один поток PR #63 после согласования 02/01/00. 07 — real-session/physical/mobile/read-only/conflict UX, 05 — HEAD-specific evidence, 04 — сохранность snapshot/provenance и границы доверия как материал диплома. [Checkpoint MASTER](../../00-project/ONEC_STUDIO_REVIEW_S2_CHECKPOINT_2026_10_31_RU.md) дополняет, а не заменяет общий канонический handoff проекта.

Есть ли здесь материал для диплома? **Да:** причина выбора revision + browser lease, отказ от молчаливой миграции общего store, проверяемая потеря обновления до/после, различие native correctness и доверенного оценивания, ограничения локального хранения. Результат измерен тестами; реальный образовательный эффект/изоляция S2 не приписываются этому результату.

WHAT WAS PROVED: scoped S1 fixes и сохранность в описанных fixtures. WHAT REMAINS: R06, LIVE/independent review, S2 approvals. ROUTING CHECK: 00/02/01/05/07/04. NEXT RECOMMENDED BRANCH: 02 совместно с01 в том же потоке. RECOMMENDED MODE: Очень высокий для store/security/runtime; Высокий для Content.
