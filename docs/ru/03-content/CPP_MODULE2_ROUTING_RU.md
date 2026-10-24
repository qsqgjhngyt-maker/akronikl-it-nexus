# M2-0 — готовые сообщения для маршрутизации

Ниже подготовлены сообщения; отправка в другие чаты этим changeset не выполняется. Main/production и официальный Release заморожены владельцем. Все дальнейшие изменения — только `feature/academy-gold-standard-cpp-module-2`.

## 02 · Project Studio / Code Studio — сейчас, первый приоритет

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03. Результат/milestone: preflight Gold C++ Module 2. Куда: 02. Почему: стандартный C++ ошибочно получает JSCPP assessment guaranteed; 13/56 сценариев router FAIL против 56/56 Clang/WASI PASS. Когда: сейчас до M2-1. Что передать: tests/fixtures/cpp-module2-probes.mjs, runtime preflight, полный evidence и M2-RUNTIME-001…003.

Готовый текст для вставки: «M2-0 в feature/academy-gold-standard-cpp-module-2 от d9249b2: аудит выполнен, допуск PARTIAL. Настоящие router/JSCPP/Clang/WASI на неизменённых исходниках: 35 программ, 56 сценариев, Clang/WASI 56/56 PASS, router 43/56 PASS. P1: 8 корректных программ отклонены; -7/3, signed/unsigned и sizeof(++n) вычислены неверно; запись в const и keyword-имя ошибочно приняты. Нужна доказанная provider-политика: совместимый Clang по умолчанию или узкий подтверждённый fast path; не переписывать правильный код ученика. До исправления строгий CI остаётся FAIL. Новые compiler versions, backend, Identity/Cloud contracts не менялись. После исправления повторить эту матрицу и M1 runtime/regression в той же feature. Main/production/release не менять». Что потом: вернуться в 03 и начать M2-1 только после закрытия runtime P1.

## 05 · Evidence и 07 · UI/PWA — после исправления runtime

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03. Результат/milestone: audit и строгий gate M2-0. Куда: 05, затем 07. Почему: требуется не допустить ложного PASS и повторения GOLD-RUNTIME-001. Когда: evidence сейчас; повторная приёмка после исправления P1. Что передать: exact feature HEAD и CI, baseline 75/585601, outline 2 JSON/22135, 0 document compiler/Gold load на Home, local transport ограничения.

Готовый текст для вставки: «05/07: M2-0 имеет PARTIAL, три P1 открыты. Приложение и production не менялись; новый gate намеренно возвращает FAIL при расхождении реального router. Не считать подготовку/Clang-only PASS полной готовностью. После исправления проверить actual Run в online Code Studio и холодный native offline, desktop/mobile размеры, первый запуск компилятора ~106 MB, диагностику и повторный запуск после ошибки. Сохранять личный код/stdin, progress/projects, storage, Cloud/Identity и NEXUS-PERF-01. Физические ПК/телефон Module 2 не проверены; прежняя личная приёмка M1 остаётся отдельным evidence. M2 content/models ещё PLANNED, авторелиза нет». Что потом: передать фактический verdict 03/00.

## 00 · MASTER — milestone сейчас

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03. Результат/milestone: M2-0 runtime/dependency audit. Куда: 00. Почему: roadmap должен отражать реальные блокеры до авторинга. Когда: сейчас. Что передать: новая feature от принятого M1, PARTIAL, 3 P1, 12 stable IDs/19 sessions, 24 Gold объекта пока PLANNED.

Готовый текст для вставки: «00: M1 test.2 остаётся принятой базой; его публикация и приёмка не изменены. В feature/academy-gold-standard-cpp-module-2 выполнен M2-0 audit: 35 реальных C++20 probes/56 сценариев, Clang/WASI 56/56, router 43/56, допуск PARTIAL из-за M2-RUNTIME-001…003 (P1). Учебный DAG 12 stable IDs/order/legacyIndex и 19 sessions проверен, перечислены мостики до первого использования синтаксиса. Legacy RU12/EN2 не объявляются Gold; 24 новых RU/EN Gold объекта ещё PLANNED. Приоритет: 02+03 закрывают runtime policy в feature, затем M2-1. Main/production/release не трогать». Что потом: обновить MASTER при закрытии P1 и возобновить M2-1; не переписывать исторический canonical handoff в sources/.

## 04 · Diploma — измеримый инженерный эксперимент

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03. Результат/milestone: differential runtime experiment и педагогический dependency audit. Куда: 04. Почему: архитектурный материал и ограничения автоматической оценки capabilities. Когда: после фиксации exact feature evidence. Что передать: исходники/hashes, actual outputs, негативные контроли и методику локального pinned transport.

Готовый текст для вставки: «04: есть материал для диплома — стандартный C++20 на неизменённых source/stdin сравнивался через реальный router и закреплённый Clang/WASI. 35 программ/56 сценариев; 13 расхождений router, в том числе три неверных результата без ошибки и два принятия ошибочного C++. Различать compile acceptance и семантическую корректность. Решение provider-политики ещё не принято; альтернативы — on-demand Clang для стандартного C++ или узкий доказанный fast path. Стоимость compiler bytes ~106 MB, Home lazy бюджет сохранён. Эксперимент синтетический, не CDN LIVE/физический телефон и не образовательный пилот. DAG/мостики reviewed, learner mastery не измерялась». Что потом: внести в evidence ledger с ограничениями, после runtime fix добавить before/after.

01: изменений Identity/Cloud/backend нет, отдельное действие не требуется. 06: новое исследование не назначается; вопрос общей корректности интерпретатора подкреплён реальными первичными результатами и адресован 02.
