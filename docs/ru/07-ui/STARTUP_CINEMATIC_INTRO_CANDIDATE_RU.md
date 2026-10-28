# STARTUP CINEMATIC INTRO — кандидат для проверки, 28.10.2026

**STATUS: PASS для implementation candidate. IMPLEMENTED / AUTOMATED PASS. Готовность к production: PARTIAL; LIVE PASS и FULL LIVE PASS не заявлены.**

Исходный main: **d76d1613a1fbf6726d453e40366c306ea502d4c7**; сверён до начала и перед фиксацией. Исходники реализации: **f58d3df33108ad25073b46ef898d46fc42d572ab**. Ветка: 'feature/startup-cinematic-intro-20261028'. Отдельная чистая копия; существующие dirty-каталоги, 'sources/', ветки 08/Content и их PR не переписывались. Изменения source: 19 файлов; отдельный последующий коммит содержит только отчёт/evidence.

## IMPLEMENTED и UX

- Внутренний слой в палитре Nexus, не экран ОС. Подключается динамически после готового первого route; bootstrap/Account gate не изменён и не ждёт видео. Нет статического импорта intro в критический граф.
- Desktop: 1920×1080→1280×720; Mobile: 1080×1920→720×1280, 30fps. Определено по декодированным техническим параметрам и просмотренным кадрам, не по именам. Длительность исходников: 5, 04 с и 8, 03 с соответственно. Исходные SHA256 и результаты преобразований — 'media.json'.
- Выбор: portrait при ширине≤1200px→mobile, остальные→desktop. Проверены 390×844, 768×1024, 1024×1366, 1366×1024, 844×390, 1440×900. 'object-fit:contain' сохраняет весь кадр; safe-area учтена. Поворот завершает сцену, не перезапускает её.
- По уточнению владельца «Пропустить» полупрозрачная (opacity0, 55), доступна сразу; hover/клавиатура проявляют её. Неяркая рамка, touch target≥48px. Escape/Tab/смена route/скрытие вкладки завершают слой; фокус возвращается в приложение. Fade220 мс, при reduced motion — без перехода.
- MP4/H.264 Main3.1 предпочтителен как меньший файл; WebM/VP9 — альтернативный codec. Runtime проверяет 'canPlayType'; отсутствие codec, отказ autoplay, 404 или задержка дают статичный fallback. Звук физически удалён, 'muted' и 'playsInline' заданы. Нет платных сервисов.
- Нет старта видео при reduced-motion, offline, save-data, 2G/3G, малом объёме памяти/числе ядер или «Упрощённом запуске». Статичный слой закрывается через 700 мс. Нет первого кадра за 1800 мс / буферизация>1200 мс→fallback; общий предел 9500 мс. При отсутствии постера остаётся встроенный фон.
- Настройки в Account→«Запуск Nexus»: «Показывать заставку», «Упрощённый запуск», явный preview. Один отдельный ключ 'akronikl:it-nexus:startup-intro:v1', schema1, версия ролика 'cinematic-v1'. Обновление приложения не сбрасывает просмотр. Маркер записывается до показа под Web Lock; сбой storage, неизвестная схема или отсутствие Web Locks отключают автопоказ. Это настройка устройства, не Account/Cloud contract.

## Размер и загрузка ДО/ПОСЛЕ

| Материал | Оригинал, байт | MP4, байт | WebM, байт | Постер, байт |
|---|---:|---:|---:|---:|
| Desktop 39e335… |38484183|2318818|3510646|101064|
| Mobile bd2714… |36974364|1997316|2363457|80488|

MP4 меньше оригиналов на 94, 0%/94, 6%. Загружается только выбранная ориентация и один codec. Все 6 медиа-файлов занимают 10371789 байт; это **необязательные online assets**, исключённые из SW public authority, включая будущие retained-поколения. Нет offline-download/cache-механизма для видео, нет quota-запроса или обязательной загрузки роликов. Отдельное офлайн-кэширование потребует отдельного согласия и проверки квоты; в кандидате такой функции нет. HTTP-cache браузера остаётся обычным браузерным поведением; офлайн-доступность ролика не обещается.

Обязательные записи PWA: 3498→3501; сумма записей: 65528868→65542909 байт; уникальные обязательные bytes: 11666702→11680743. Прибавка — три малых JS/CSS-файла и hook, **не видео**. Комплект сборки: 66411808→76797764 байт, включая retained-версии.

7 холодных контекстов на экран и вариант, чередование ДО/ПОСЛЕ; фиксированная задержка 20 мс статике/30 мс API; без compression. До готовности экранов intro/media-запросов не было; критический граф получил только 345 байт hook.

| Экран | ДО, медиана мс | ПОСЛЕ, медиана мс | Запросы до готовности | Bytes до готовности |
|---|---:|---:|---|---|
| home | 556.1 | 565.9 | 88 → 88 | 982565 → 982910 |
| academy | 564.2 | 546.8 | 88 → 88 | 982565 → 982910 |
| code-studio | 706.8 | 678.9 | 102 → 102 | 1069456 → 1069801 |

Главная колеблется примерно на 10 мс; диапазоны выборок перекрываются. Измеримого существенного ухудшения в этих локальных условиях не выявлено. Это не доказательство нулевого влияния на любом устройстве/сети и не заявление об ускорении.

Чистая установка PWA: 2 контекста на вариант, 120 мс задержка ответа, без compression. ДО: 22.0/21.5 с; ПОСЛЕ: 21.7/21.3 с. Ответы: 13406255→13420440 байт; запросы: 467→470; media requests=0 во всех 4 запусках. Подробности, browser resource timings и разброс — в evidence.

## Проверки

| Контур | Результат |
|---|---|
| Новая policy и сборка, включая retained-media |5/5 PASS|
| Intro в настоящем Chrome: decode MP4/WebM, skip/ended/settings/relaunch/offline/failures/tablets |10/10 PASS|
| Прежний полный запуск entry→Account→Academy→Code Studio/Blog |7/7 PASS|
| PWA lifecycle: install, 2 вкладки, update, rollback, cold offline, private cache boundary |6/6 PASS|
| Offline-First: encrypted vault, редактирование, progress, checkpoint, STL compile без сети, конфликты, quota |12/12 PASS|
| Реальные локальные BFF/Worker/SQLite/WebAuthn: offline edit→reconnect→явные Cloud PUSH/PULL→logout |5/5 PASS|
| Account bootstrap / isolation / Cloud unified |25/21/14 PASS|
| Прежние startup/lazy/learning views |17/17 PASS|
| Code Studio / Project Studio foundation |PASS / PASS|
| PWA policy/controller |5/5 и 5/5 PASS|
| Точная пересборка |3511 файлов, все bytes/SHA256 совпали|
| Source rollback |revert source-коммита в отдельном worktree точно восстановил tree main|

Браузер настоящий; аккаунты/сессии/данные синтетические. Cloud/PUSH/PULL выполнялись только на локальном стенде, production не изменялся. Настоящий Clang/WASI проверен с закреплёнными SHA256 bytes; CDN LIVE не заявлен.

Прежние offline-тесты содержали 40 тем и старые '#memoryLab/#oopLab' внутри Gold-уроков; actual main содержит 56 тем и Gold-модели. Проверки приведены к manifest и реальным Gold-controls; содержимое курса не редактировалось. Неудачные прогоны сохранены локально и описаны в журнале ниже.

## Сохранность и ограничения

Контрольные CacheStorage/IndexedDB/project/progress bytes пережили показ, настройки, сохранение, перезапуск, обновление SW и откат. Ни CacheStorage.clear/delete, ни удаление IDB, ни миграция пользовательских данных не добавлены. Account/Identity/Cloud/API/BFF/Worker/D1/IAM/OAuth, Course/Content и runtime packs не менялись. Прежний production/rollback остаётся действующим. Штатный source builder получает только отдельную optional-media классификацию и безопасные generation overrides.

Не проверены физические Android/iPhone, Safari/Firefox, standalone-install OS UI и живые production аккаунты. CPU/energy/слабые реальные устройства требуют 07-gate. Поддержка codec зависит от браузера/ОС; заявлено только runtime capability detection и конкретные Chrome-прогоны. См.[MDN canPlayType](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canPlayType),[autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay),[codec guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs).

## Сборка и точный rollback

В чистой feature-копии: 'npm ci --prefix server-access --ignore-scripts --no-audit --no-fund'; затем 'node tools/build-startup-intro-candidate.mjs --out <новый-каталог>'. Это локальный результат с generation 'ui1a-startup-cinematic-candidate-20261028'; он сохраняет прежние retained-поколения и не переписывает release-candidate.json. Официального релиза/публикации не было.

Для проверки видео используйте сохранённые 6assets; повторное кодирование: 'tools/prepare-startup-intro-media.mjs' с путями к обоим оригиналам и FFmpeg. Проверяются точные source SHA256; для байтовой воспроизводимости сборки используются уже закоммиченные media bytes, а не повторное кодирование другой версией encoder.

Операционный откат UI — выключить «Показывать заставку». Точный source-откат: **git revert f58d3df33108ad25073b46ef898d46fc42d572ab**, на отдельной согласованной ветке. Он проверен в disposable worktree: итоговый tree **1e4ae0840ef6ba2eb0a93f618ba2b81ee9b54b7f**, равный исходному main. Бинарный обратный patch сохранён отдельно в пакете задачи; удалять пользовательские ключи/кэши/IDB не требуется. После будущих параллельных интеграций разрешать конфликты по 19 файлам source, не откатывать весь main. Если когда-либо публиковать: отдельно собрать новый immutable generation и сохранить принятые предыдущие bytes; source-revert сам по себе не deployment. В этом задании никакой deployment rollback не выполнялся, поскольку deployment отсутствовал.

## Журнал попыток

1. Установочный тест считал все файлы public→гипотеза: optional media ошибочно входит в ожидания→manifest показал 0media-запросов→исправлен только expected-set; 6/6PASS, retained-exclusion проверен отдельно.
2. Первый новый browser fixture ждал evaluate в ещё не отданном navigation response→deadlock теста→исключена навигация из измерительного evaluate; полный intro suitePASS.
3. Наследованный offline-test ожидал 40 тем и legacy-controls→actual Gold-main56 тем→обновлены test contracts без Content-правок; 12/12PASS с настоящим offline compile.
4. Первый сервер замеров отдавал public responses с no-store→SW правильно отказался устанавливать их→fixture исправлен на public, max-age=0, добавлен 90 с предел; 4 чистые установки PASS.
5. Local clone для proof-отката запрещён средой MSYS→использован отдельный git worktree; source tree совпал побайтно. Production и чужие worktree не затрагивались.

## ROUTING CHECK и публикация

Готов к review/test как implementation candidate. Merge в main, production deployment, GitHub Release, платные ресурсы и изменение IAM/OAuth/BFF/Worker/D1 **не выполнялись и не разрешены этим отчётом**. Перед публикацией нужны 07physical/browser gates, 05evidence/release gate и отдельное разрешение владельца. Готовые сообщения для 05/00/08/03/04 — в соседнем ROUTING-файле. MASTER HANDOFF как новый production baseline не перезаписан; сначала 00 фиксирует candidate-milestone.

Есть ли здесь материал для диплома? **Да**: ADR — lazy optional-media layer с независимым auth/route readiness и отказом от обязательного video cache. Альтернативы: блокирующий splash, eager-import и видео в SW-наборе; отклонены из-за latency, квоты и offline/security-инвариантов. Доказательства: 42 замера старта (21 пара ДО/ПОСЛЕ), 4 установки, decode/failure/regression, точный source rollback. Ограничение: синтетический стенд, нет physical/live. RECOMMENDED MODE:«Очень высокий» для финальных 07/05gates.
