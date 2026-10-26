# M5 runtime: стандартные исключения C++ в Clang/WASI

26.10.2026. Решение реализовано в feature/academy-gold-standard-cpp-module-5, source7dfc9d7. Main/production/официальный Release не меняются. Этот документ описывает архитектуру; итоговые статусы приёмки фиксируются отдельно.

## Проблема и решение

До исправления `inspect` обещал guaranteed для любого C++, хотя `run` блокировал try/throw/catch. Ручное удаление обычных строк и комментариев регулярными выражениями ошибочно принимало содержимое raw literal за токен исключения. Даже простое снятие guard не решает несовместимость: прежние headers/libc++abi и Worker настроены без EH.

После исправления прежний SHA-pinned YoWASP Clang22 компилирует C++20 с final WebAssembly EH. Из официального WASI SDK33 выбран совместимый wasm32-wasip1 sysroot: C headers/static libc, exception-enabled libc++/libc++abi/libunwind и __config_site. 1678 C++ headers доказанно идентичны прежнему resources.tar и используются повторно. Библиотечные файлы не редактировались. Clang, Runno, исходники учащегося и их стабильные пути не заменяются.

Флаги C++ native-EH: `-fwasm-exceptions -mllvm -wasm-use-legacy-eh=false -lunwind`, с отдельными sysroot/include/library roots. В каждом translation unit одна ABI-конфигурация, headers согласованы с библиотеками. Исходные learner files проверяются прежними квотами до подключения read-only vendor tree; vendor files не попадают в экспорт работ и не сохраняются как пользовательский код. Внутренний root выбирается без пересечения с файлами проекта. C17 продолжает использовать прежний C toolchain.

Ручной поиск exception keywords полностью удалён. Литералы, комментарии, макросы, включённые headers и корректность синтаксиса определяет Clang. Это сохраняет и учебную семантику исключений, и исходный текст.

## Совместимость движков

Синхронный минимальный Wasm probe проверяет final EH с exnref/try_table, плюс доступность gzip DecompressionStream. Проверки одного WebAssembly.Exception недостаточно: это может означать только legacy EH. На совместимом движке `cppExceptions=true`, `inspect` объявляет поддерживаемый EH и исполнение использует эту библиотеку.

Без нужного feature остаётся прежний no-EH режим C++ с `best-effort`, feature исключений явно unsupported. Если Clang обнаруживает try/throw при отключённых исключениях, Worker возвращает `WASM_CPP_EXCEPTIONS_UNSUPPORTED`, providerLimit=true, без подсветки строки как ошибки ученика. Прочие compile errors и необработанное исключение сохраняются ошибками компиляции/исполнения. После отказа следующий запуск работает. Данные не очищаются, JSCPP/удалённый compiler не подключаются.

Отрицательный browser control явно симулирует отказ минимального feature probe в page и module Worker, но всё ещё использует настоящие Clang/WASI/no-EH compilation. Это не физическая проверка старого Chrome/Safari. Предварительная попытка отключить feature V8-флагом не сработала и сохранена в failed experiments; она не считается PASS.

## Доставка, границы доверия и производительность

Дополнение — data-only gzip-контейнер 4390769 B, распакованный размер13989197 B, с ограниченным индексом файлов. Producer сверяет SHA256 официального архива и прежнего resources.tar, а также все повторно используемые headers. Runtime проверяет compressed digest/размер до распаковки, ограничивает decompressed size, paths/offsets/duplicates и повторяет загрузку после отказа. Повреждение не считается readiness. Лицензии и provenance находятся в runtime-packs/wasi-sdk33.

URL закреплён на immutable asset commit `adf91d730598d3a02a21ddca3183f76b56d8d1b8`; graphID и digest входят в точный PWA runtime manifest. Первые семь runtime resources сохраняют прежние bytes/digests. Действительная CDN GET проверка: HTTP200, MIME application/octet-stream, CORS*, ожидаемый SHA256. Это только проверка публичного пакета, не Nexus production LIVE.

В сгенерированных QA entry.js/oauth-client.js изменяется включённый блок runtime-manifest (graphID и восьмой ресурс). Всё вне этого блока побайтно совпадает с принятой сборкой; source Identity/OAuth и wire contracts не меняются. Исторические entry-assets/releases сохранены и отдельно воспроизведены из main065606a. QA build использует прежний generation ID только в изолированном профиле; публикация потребовала бы нового поколения и отдельного gate, сейчас она запрещена владельцем.

Root runtime-packs не входит в frontend public precache: Home не скачивает библиотеки. Подготовка компилятора сохраняет восьмой ресурс по прежнему проверенному PWA протоколу. Cold Offline повторяет реальную компиляцию после полного закрытия браузера, без сети. Старые runtime resources, immutable поколения, caches/databases, владелец аккаунта, Identity/Cloud/ProjectStore и прогресс не меняются. Нет backend, Worker/BFF/D1 deployment или новых сетевых путей передачи learner code.

Первичная подготовка полного runtime: 105558342 → 109949111 B, +4,16%. В локальном Home trace нет vendor runtime запросов, пакета EH или Gold bodies. Static NEXUS-PERF-01: 75 модулей / 590791 B при caps75/600000, outline2/27551 B при cap30000. Field timing, физический телефон и предел памяти на всех устройствах этим аудитом не измерялись.

## Альтернативы и ограничения

- Одного флага исключений поверх no-EH sysroot недостаточно для согласования ABI и unwinder; решение обязано подтверждаться исполнением.
- Переписывание примеров в status codes либо перехват keywords меняет учебный предмет и ломает допустимые программы; этот путь исключён.
- Полная загрузка официального multi-target sysroot потребовала бы дополнительно124253494 B. Выбран только нужный неизменённый subset с повторным использованием доказанно одинаковых headers.
- Смена всего закреплённого Clang или удалённая компиляция расширяет объём регрессии и контракты приватности/Offline; для этого решения они не понадобились.
- Пакет статический: shared libraries, threads, Preview2 и LTO не обещаются. Поддержка всех возможностей C++20, всех браузеров и эффективность обучения не выводятся из ограниченной матрицы тестов.

## Основания и материал для диплома

Официальные источники: [WASI SDK33](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-33), [EH flags и устройство sysroot](https://github.com/WebAssembly/wasi-sdk/blob/wasi-sdk-33/CppExceptions.md), [YoWASP build configuration](https://github.com/YoWASP/clang/blob/944dd7c774954180e621cc8e12984023a7f8bcbe/build.sh), [final-EH feature probe](https://github.com/GoogleChromeLabs/wasm-feature-detect/blob/main/src/detectors/exceptions-final/index.js). Upstream statements сопоставлены с реальными pinned bytes и execution proof; документация сама по себе не объявляется PASS.

Для диплома зафиксированы противоречие declared capability/actual execution; границы parser и runtime; ABI before/after; data-only late loading и verified Offline; неизменность learner source; разделение native reference, реального WASM и simulated feature controls; scope по точным hashes; воспроизводимые отказы и их исправления. Измеримы byte delta, число проверок и фактические результаты. Ограничения: synthetic accounts, viewport вместо physical devices, отсутствие нового production LIVE и эксперимента учебной эффективности.
