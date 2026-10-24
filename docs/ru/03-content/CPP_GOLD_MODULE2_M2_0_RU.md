# C++ Module 2 — M2-0: runtime и учебные зависимости

24.10.2026. Ветка `feature/academy-gold-standard-cpp-module-2`, база `d9249b2e977483718cd67a151f62552296dd51e4` (принятый Module 1 test.2). Main, production, версии приложения и официальный Release не изменяются.

**STATUS: PARTIAL.** Проверка M2-0 выполнена; допуск к Gold Module 2 не пройден. Найдены воспроизводимые дефекты выбора runtime. M2-1…M2-5 остаются PLANNED. Новые Gold-уроки не активированы, работа компилятора не исправлена этим changeset.

## Что проверено реально

Локальный Chromium, настоящий bootstrap/app, native service worker, router и Worker. Семь файлов закреплённого Clang/WASI и JSCPP доставлены из локального SHA256-проверенного cache. Использована синтетическая учётная запись на loopback, без реальных credentials, пользовательского профиля, Cloud Sync и production-запросов. Это AUTOMATED evidence, не CDN LIVE, не запуск на физическом телефоне и не повторная приёмка аккаунта владельца.

Матрица: **35 исходников / 56 сценариев** (53 сценария корректного C++ и 3 ожидаемые ошибки компиляции). Для каждого случая фактический router выполняется первым; если он выбирает JSCPP, тот же исходник и stdin отдельно проверяет Clang/WASI. Подмена исходника/Worker/stdout не используется. Зафиксированы 56 попыток Clang/WASI и 26 попыток JSCPP. Clang/WASI: **56/56 PASS**, включая ожидаемые ошибки. Router: **43/56 PASS**, **13 FAIL**, без page/console/SW ошибок. Исходники запросов сохранены неизменными.

Покрыты constexpr, const, литералы, инициализация, numeric_limits, размеры типов, scope/copy, выражения, арифметика, преобразования, signed/unsigned, bool/short-circuit, prefix/postfix, sizeof, ссылки/указатели/nullptr, stream state, string/getline/ws, точность вывода и черновой эталон итогового расчёта. Комбинированный probe не доказывает полную поддержку каждой конструкции по отдельности.

Размеры на данном WASM target: `char/short/int/long/long long/void* = 1/2/4/4/8/4`. Это наблюдение, а не универсальные размеры C++. Проверяется переносимый порядок размеров; минимальные численные свойства int/long long проверяет отдельный numeric_limits probe.

## Открытые дефекты допуска

| ID / приоритет | Воспроизведение | Фактический router | Clang C++20 | Требование закрытия |
|---|---|---|---|---|
| M2-RUNTIME-001 / P1 | Разделители цифр; brace-init/auto; `<limits>`; sizeof набора типов; широкий литерал с разделителями; static_cast; unsigned modulo; ссылка/alias | 8 корректных программ отклонены JSCPP с parser/library/overflow/internal error; assessment при этом `guaranteed` | Все 8 PASS | Правильный C++ уходит к совместимому provider; исходник ученика не переписывать, unsupported provider не выдавать за ошибку ученика |
| M2-RUNTIME-002 / P1 | `-7/3`; `int(-1) < unsigned(1)`; `sizeof(++n)` при n=3 | JSCPP выдаёт соответственно -3, 1 и изменяет n до 4 | -2, 0, n остаётся 3 | Строгая семантика C++20 во всех трёх случаях; повторить общий матричный gate и M1 regression |
| M2-RUNTIME-003 / P1 | Запись в const; `int class=2;` | JSCPP принимает обе ошибочные программы, exit 0 | Обе отклонены на compile phase | Реальный C++ compiler должен выдавать диагностику; не учить допустимости этих исходников |

11/53 корректных сценариев отклонены или вычислены неверно, 2/3 ошибочных сценариев ошибочно приняты. Третий compile-fail — list narrowing — отклоняется обоими движками. PASS остальных probes не доказывает общую совместимость JSCPP с C++20. Нельзя скрыть дефекты добавлением бессмысленного constexpr, удалением return, превращением корректного примера в другой C++ или пометкой всего этого как ошибки учащегося.

**Решение M2-0:** capability-политика требует отдельного исправления в этой feature с routing в 02. Возможные варианты: совместимый Clang/WASI по умолчанию для стандартного C++ или доказанный узкий fast path. Набор regex, закрывающий только известные строки, сам по себе не доказывает корректность произвольных арифметических выражений. Выбор и реализация политики пока PLANNED. Этот changeset содержит аудит и строгий gate; FAIL оставлен видимым и не превращён в PASS.

## Учебные зависимости

Проверены все 12 stable ID, order 9…20, legacyIndex 8…19 и 19 учебных сессий. Машинно проверенный редакционный DAG и требования к объяснениям: [CPP_MODULE2_DEPENDENCIES.json](CPP_MODULE2_DEPENDENCIES.json). У каждого урока есть явные prerequisites, объяснения до первого использования, граница scaffolding/самостоятельной работы и runtime probes. Нет forward links или циклов. Это редакционный граф, не внедрённая Skill Graph и не блокировка прогресса ученика.

Внесены обязательные мостики: объявление переменной в первой программе до полного урока variables; минимальные const/int до обзора типов; `<T>`, `::`, `max()` для чтения numeric_limits до курса шаблонов; sizeof(type) в types до разбора unevaluated operand; LL до первого опасного умножения; базовый if из M1 перед проверкой диапазона; string/getline/ws до углублённых строк и streams. Каждый мостик должен реально войти в текст и разбор Gold-урока. Наличие в плане ещё не означает, что ученик его освоил.

Функции как отдельная учебная тема остаются пробелом полной 40-темной программы; main используется как объяснённая заготовка. Новые функции, циклы, from_chars, new/delete, pointer arithmetic, исключения и полная теория streams не нужны для M2. UB, null/dangling dereference и чтение неинициализированной памяти не используются как обычные исполняемые задания. Prefix/postfix изучаются отдельными шагами; приоритет не выдаётся за порядок вычисления.

Для итогового проекта проверены 17 сценариев конечного stdin: 4 расчёта (включая максимум), 12 невалидных вводов и один ввод с конечными whitespace. Clang/WASI/router проходят 17/17; максимум `1000000 1 100` даёт `16777216000 279620266 40`. Эталон — только probe, полный Gold-проект и оценка решений ученика ещё не реализованы. Enter в интерактивном терминале не объявляется EOF; `ws` съедает начальные whitespace и пустые строки.

Текущая интеграция Gold сознательно ограничена M1: точный catalog, проверка moduleId в registry, существующие модели, M1 CQG и map источников. В JSON выделены M2-INT-01…05 для будущего расширения. Сейчас 12 legacy RU и 2 legacy EN; 24 полноценных M2 Gold RU/EN объекта ещё не написаны.

## Совместимость и производительность

Приложение, каталог уроков, published generations, compiler/provider/router, Identity, storage, Cloud Sync, Project Studio и PWA **побайтово совпадают с принятой базой**. Снимки SHA256 — в evidence. Ветки main и Module 1 не перемещаются. Связанные серверные данные не читаются и не меняются. В репозиторий входят только tests, tools, feature CI и документация.

NEXUS-PERF-01: 75 статических модулей, 585601 bytes при пределах 75/600000. Home использует 2 C++ outline JSON / 22135 bytes; в Resource Timing документа — 0 Gold lesson bodies и 0 compiler/provider загрузок. Фоновый public precache service worker учитывается отдельно: он вправе получить static assets, это не выполнение runtime на Home. Девять проверок lazy imports/startup PASS. Это не полный новый физический UX/performance замер первой загрузки: новый M2 UI ещё отсутствует. Компилятор остаётся прежним on-demand пакетом ~106 MB.

## Воспроизведение и evidence

- `node tools/check-academy-gold-module2-dependencies.mjs` — проверка ID/DAG/source invariants и статического бюджета.
- `node --test tests/platform-lazy-imports.test.mjs tests/platform-startup-load.test.mjs` — startup/outline regression.
- `node tools/check-academy-gold-module2-cpp.mjs` — настоящий host g++ C++20 + UBSan; локально Windows g++ отсутствует, результат требует CI, не заявлен заранее.
- `node tests/academy-gold-module2-preflight.mjs` — реальные browser runtime, через ту же изолированную fixture, что M1; нужны frontend build, Playwright, pinned bytes и ephemeral loopback TLS.

Feature workflow `.github/workflows/academy-gold-cpp-module-2-preflight.yml` запускается только на этой feature, имеет `contents: read`, не содержит deploy/release/merge шагов и сохраняет FAIL evidence. Строгий runtime gate ожидаемо красный до закрытия P1; успешный подготовительный job не считать допуском Module 2. CI exact head фиксируется отдельно по факту завершения.

Первая локальная попытка остановилась до C++: проверка Home смешала Resource Timing документа с background SW precache. Исправлено измерение, а не приложение. После разделения потоков матрица завершилась; первоначальный неуспех сохранён в локальном evidence. Это ограничение методики не объясняет 13 runtime расхождений, подтверждённых отдельными реальными запусками.

Первичные источники правил, сверены 24.10.2026: [деление](https://eel.is/c++draft/expr.mul), [sizeof](https://eel.is/c++draft/expr.sizeof), [обычные арифметические преобразования](https://eel.is/c++draft/expr.arith.conv), [целые типы и unsigned modulo](https://eel.is/c++draft/basic.fundamental). Это living draft, не копия опубликованного C++20; исполняемая проверка явно использует C++20. Полные результаты реального компилятора важнее предположения по списку capabilities.

## Routing и следующий шаг

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03 · CONTENT PRODUCTION. Результат: M2-0 audit завершён, допуск PARTIAL. Куда по приоритету: 02 → 05/07 → 00 → 04. Когда: сейчас, перед исправлением политики runtime и новым крупным этапом. Полные сообщения подготовлены в [CPP_MODULE2_ROUTING_RU.md](CPP_MODULE2_ROUTING_RU.md); автоматически в другие чаты не отправлялись.

Есть ли здесь материал для диплома? Да: воспроизводимый differential experiment на одинаковых C++20 исходниках, ошибки синтаксического capability assessment и ложноположительная «совместимость» при неверной семантике. Доказаны конкретные расхождения, а не эффективность обучения или общая полнота компилятора. Альтернативы и стоимость on-demand Clang зафиксированы для будущего ADR; production-политика ещё не изменена.

WHAT WAS PROVED: реальные runtime/probes, учебный DAG, stable IDs и отсутствие изменений приложения/публикации. WHAT REMAINS: три открытых P1, решение provider-политики, повторный строгий gate и regression, затем M2-1. ROUTING CHECK: 02/05/07/00/04. NEXT RECOMMENDED BRANCH: 02 совместно с 03 в той же feature. RECOMMENDED MODE: Высокий.
