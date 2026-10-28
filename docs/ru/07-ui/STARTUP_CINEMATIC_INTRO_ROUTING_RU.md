# 🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 07 · UI / UX / MOBILE / PWA.
Результат: STARTUP CINEMATIC INTRO — IMPLEMENTED / локальный AUTOMATED PASS; общий STATUS: PARTIAL, GitHub publication gates FAIL.
Когда: сейчас, до интеграции и публикации.

## 1. Куда: 05 · RELEASE / EVIDENCE / DOCUMENTATION, затем 00 · MASTER

Почему: зафиксировать результат, доказательства и оставшиеся условия публикации.
Что передать: исходный main d76d1613a1fbf6726d453e40366c306ea502d4c7; реализация f58d3df33108ad25073b46ef898d46fc42d572ab; ветка feature/startup-cinematic-intro-20261028; результаты тестов и проверенный откат.

Готовый текст для вставки:

> Получен кандидат STARTUP CINEMATIC INTRO от ветки 07. Основа main: d76d1613a1fbf6726d453e40366c306ea502d4c7; реализация: f58d3df33108ad25073b46ef898d46fc42d572ab. Отдельная ветка feature/startup-cinematic-intro-20261028. IMPLEMENTED / AUTOMATED PASS: 10 сценариев Intro, 6 PWA lifecycle, 12 Offline-First, 5 локальных Account/Cloud. Есть 42 замера старта (21 пара ДО/ПОСЛЕ), 4 чистые установки PWA, скриншоты и точный source rollback. MP4 занимают 2,32/2,00 МБ; видео не входят в обязательную установку SW. По уточнению владельца кнопка «Пропустить» полупрозрачная. Нужны review 05 и физические проверки 07; LIVE/FULL LIVE не заявлять. main, production и GitHub Releases не менялись. Ветка 00 фиксирует candidate milestone; MASTER обновляется после согласованного closure.

Что потом: 07 проверяет физические Desktop/Android/iPhone/Safari; 05 закрывает evidence gate; владелец отдельно разрешает публикацию.

Дополнение после создания Draft PR №47 — готовый текст для 05/03/00:

> В PR №47 пять GitHub jobs остановились на verifyM5HeaderPublication: receipt принятого M5 требует прежние байты core/app.js, а новый Intro hook закономерно меняет файл. Функциональные тесты локального кандидата PASS; общий статус PARTIAL, не release-ready. Требуется спроектировать и согласовать отдельный контракт Intro-кандидата с точной областью изменений, проверкой сохранности M5 и собственной CI-матрицей. Не менять хеши принятого M5, не отключать validators и не считать прежний receipt разрешением на новую публикацию. Материал: docs/evidence/startup-cinematic-20261028/GITHUB_CI.json. После согласования вернуться к 07/05 и повторить интеграционный gate.

## 2. Куда: 08 · Akronikl и 03 · CONTENT

Почему: общая точка запуска core/app.js и уточнение двух устаревших тестов. При интеграции нельзя потерять параллельные изменения.
Что передать: отложенный импорт Intro после bootstrap; изолированные модули; отсутствие изменений Content/Identity contracts; актуальные manifest/Gold selectors в offline-тесте.

Готовый текст для вставки:

> В 07 готов кандидат STARTUP CINEMATIC INTRO от main d76d1613a1fbf6726d453e40366c306ea502d4c7. В core/app.js добавлен только отложенный dynamic import после готового первого экрана. При интеграции с 08 объединить этот hook с lazy-hooks Akronikl и повторить запуск, Account и Offline-First. Не заменять bootstrap или дерево файлов целиком. Content, Skill Graph, Mastery и Learning Events не менялись. Два общих offline-теста уточнены: необязательные media исключены из ожиданий SW; число тем берётся из текущего manifest (56), интерактивные уроки проверяются через актуальные Gold controls. Ветки и PR 08/Content не переписаны.

Что потом: вернуться в 07/05 для регрессии объединённого кандидата.

## 3. Куда: 04 · DIPLOMA / ВКР

Почему: архитектурное решение и измеримый эксперимент.
Что передать: причины выбора lazy-layer, отказ от обязательного video cache, измерения, сохранность и ограничения стенда.

Готовый текст для вставки:

> Материал для ВКР: неблокирующий внутренний Intro Layer, lazy import после Account/route readiness, отдельная версионированная настройка устройства с Web Lock, безопасный отказ при сбое storage/schema/codec и optional video вне SW install authority. Получены 42 замера старта (21 пара), 4 установки PWA, реальное декодирование MP4/WebM, 12 офлайн-проверок и точный source rollback к tree 1e4ae0840ef6ba2eb0a93f618ba2b81ee9b54b7f. Блокирующий splash, eager import и видео в обязательном SW-наборе отклонены из-за latency, квоты и offline-инвариантов. Источник реализации: f58d3df33108ad25073b46ef898d46fc42d572ab. Стенд синтетический, Chrome настоящий; физический LIVE не заявлен. Оформить ADR, эксперимент, ограничения и evidence ledger.

Что потом: 04 оформляет checkpoint и передаёт результат в 00.

06 Research сейчас не требуется. Серверные и runtime contracts веток 01/02 не менялись; их локальная регрессия включена в evidence 05. MASTER HANDOFF не перезаписан как новая production baseline.
