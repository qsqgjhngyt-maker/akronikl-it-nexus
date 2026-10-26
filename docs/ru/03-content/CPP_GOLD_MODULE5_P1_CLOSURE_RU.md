# C++ Module 5: оба P1 закрыты, повтор M5-0 и M1–4

26.10.2026, Asia/Krasnoyarsk. **STATUS: PASS — AUTOMATED PASS в проверенной feature-области.** M5-P1-01 и M5-P1-02 CLOSED. Исправления и полный повтор проверены на `7dfc9d7378e57899cb8d5087c850a5089cfe83f8` в `feature/academy-gold-standard-cpp-module-5`. Последующая фиксация отчёта только документальная.

Main остаётся `065606a788198045cadf250fea663246ddbb2d56`, production …10.8-test.2 не менялся. Официальный Release/тег, merge main, frontend/backend deployment, D1/Identity/Cloud migrations не выполнялись. Нового LIVE/physical-device PASS нет. Это допуск runtime к дальнейшему Gold-authoring M5; девять тем / 18 RU/EN объектов ещё PLANNED, новых progress IDs не назначено.

## Что исправлено

**M5-P1-01.** Прежний Clang22 теперь использует совместимые exception-enabled библиотеки WASI SDK33 и стандартные инструкции WebAssembly EH. Проверены раскрутка стека, cleanup частично созданного объекта, typed rethrow, strong guarantee, исключения STL, exception_ptr/nested_exception и переход между translation units. `inspect`, feature capabilities и действительное исполнение согласованы. При отсутствии нужного browser feature честно показывается best-effort/no-EH; Clang определяет неподдерживаемый синтаксис, UI не обвиняет строку кода ученика. Последующий запуск восстанавливается после отказа.

**M5-P1-02.** Ручной regex guard удалён. Литералы, комментарии, макросы и headers разбирает Clang. Исходный воспроизводитель `R"tag(" throw ")tag"` теперь печатает `" throw "`. Дополнительно прошли raw prefixes/custom delimiter/comments, слова в data file и допустимые C identifiers; настоящая macro-exception исполняется либо даёт честное ограничение старого движка. Исходники не переписываются.

Затронуты ровно четыре product source пути: `sandbox/cpp-exceptions.js`, `sandbox/providers/wasm-runtime.js`, `sandbox/workers/wasm-runtime-worker.js`, `pwa/runtime-manifest.js`. Точный allowlist, до/после SHA256 — `CPP_MODULE5_RUNTIME_SCOPE.json`. Source Identity/Cloud/ProjectStore/storage, все учебные JSON, stable IDs и опубликованные immutable поколения побайтно сохранены.

## Фактическая матрица

[CI40276100805](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40276100805) завершён **SUCCESS, 7/7 jobs**. Все текущие C++ прогоны выполнены заново с новым runtime; старый WASM PASS не переиспользован.

| Проверка | Результат |
| --- | --- |
| M5-0, host g++13.3 / C++20 / UBSan | 31 программа, 37/37 случаев PASS; три случая — ожидаемые ошибки компиляции |
| M5-0, настоящий router/Worker/Clang-WASI | 37/37 PASS, включая восемь EH случаев; 0 unsupported, 0 unexpected failures |
| Native/WASM source parity | Одинаковые source/cases/files/stdin/metadata и ожидания; SHA256 проверены, исходники неизменны |
| Boundary controls | 11/11 PASS: native EH, явная симуляция отсутствующего feature, raw/data/macros/C, uncaught exception и recovery |
| Реальные кнопки Code Studio | 4/4 локальных smoke на viewport1366/390: raw literal и catch, exit0, исходник не меняется |
| M1 Gold | 22 программы, 173 реальных случая PASS; 394 RU/EN alias records сохранены; UI2 и cold Offline PASS |
| M2 Gold | 126 пакетов программ, 182 случая, UI13 PASS |
| M3 Gold | 75 пакетов программ, 223 случая, UI6 PASS; многофайловый проект, явный save артефакта и повторный импорт |
| M4 Gold | 35 пакетов программ, 190 случаев, UI9 PASS; многофайловый проект, явный save артефакта и повторный импорт |
| Общая регрессия | 34 группы, 13 интеграционных групп, 39 прямых node tests PASS; дополнительные встроенные content gates PASS |

В M1–4 суммарно 768 проверочных случаев. Отрицательная компиляция считается PASS только при ожидаемой диагностике; это не успешное исполнение ошибочной программы. Количества UI, node и C++ cases не смешиваются в общий показатель покрытия. Host PASS не заменяет настоящий browser proof. Отрицательный feature control не выдаётся за физический старый браузер.

Jobs: native121419068913, invariants121419068820, browser121419068592; M1 121419068931, M2 121419068671, M3 121419069122, M4 121419068809 — все SUCCESS. Машинные результаты, hashes и семь проверенных artifact digests: `CPP_MODULE5_P1_CLOSURE_EVIDENCE.json`.

## Сохранность и производительность

M5 — 11 synthetic preservation групп PASS: 0/50, 23/50, 40/50, 50/50, legacy40/40, неизвестные IDs, повторный import, account isolation, VFS/quiz/stdin, настоящий ProjectStore/checkpoint и conflict/replay Offline merge. Прежние M3 и M4 preservation checks также PASS. Будущие 50/56 вычисляются только в памяти теста; curriculum остаётся50, legacy40.

Настоящий encrypted cold Offline: после полного закрытия браузера и отключения сети сохранились все50 записей, legacy40/40, неизвестные поля, проект и checkpoint; три прежних M5 ID × online/Offline × viewport1366/390 = 12 сочетаний PASS. Code Studio исполнил исключение между двумя TU, вывел7, exit0; исходники и файлы сохранены. Это синтетические профили. Личный аккаунт/работы владельца не читались и не менялись, Cloud PUSH/PULL не выполнялся.

**NEXUS-PERF-01 PASS в измеренной области:** static75 модулей / 590791 B при caps75/600000; outline2 файла / 27551 B при cap30000. Home document не подгружает Gold/compiler; отдельный context/SW trace показал0 запросов восьми vendor runtime ресурсов. Новый пакет не входит в public precache. Field timing и физический телефон не измерялись.

Data-only пакет4390769 B по immutable asset commit `adf91d730598d3a02a21ddca3183f76b56d8d1b8`, SHA256 `b901e4aa3f7e5f5c3917ddd4d9f40c06eadbf53567f60d3ea6ad46105029a8d2`. Действительная CDN GET: HTTP200, ожидаемые MIME/CORS/SHA256; code не передаётся. Полная первичная подготовка runtime увеличилась с105558342 до109949111 B (+4,16%). Первые семь ресурсов не меняются. Producer проверил официальный SDK archive, повторное использование1678 headers и все выбранные файлы; повреждённый пакет отвергается и не кешируется как готовность. Upstream libraries не редактировались, лицензии сохранены.

## Сборка, failed experiments и ограничения

Изолированный QA build содержит2978 файлов:2970 прежних файлов неизменны, семь пересозданы, один helper добавлен, удалений нет. В entry.js/oauth-client.js отличается только встроенный runtime-manifest; всё вне этого блока равно принятой сборке. Root version/HTML неизменны, build manifest/SW пересозданы. Полный исторический M4 rebuild из main065606a прошёл отдельно и побайтно совпал с опубликованным пакетом. Этот QA build не публикуется под прежним generation ID; новое поколение и publication/rollback gate потребуются только после разрешения владельца.

Неудачные попытки сохранены: objcopy не поддержал запись archive, первая sandbox browser попытка не получила loopback network access, V8 flag не отключил feature, первый test wrapper потерял сообщение при dynamic import, исторический gate отверг rebuild изменённого source как прежней публикации. Частичные outputs/ложный feature control не использовались как PASS. Очередь test wrapper, разрешённый isolated QA и rebuild из архивного source устранили проблемы самих проверок; продукт не ослаблялся. Подробности и воспроизводимые методы находятся в локальном evidence каталоге.

Ограничения: нужен final WebAssembly EH и DecompressionStream для native исключений; старый движок остаётся best-effort/no-EH. Shared libraries/threads/LTO/все возможности C++20 не обещаются. Конечная матрица и synthetic accounts не доказывают работу всех устройств или эффективность обучения. В M5 ещё нет новых Gold-уроков. Архитектура, альтернативы, источники и материал для04: `CPP_MODULE5_RUNTIME_ADR_RU.md`.

## Routing и следующий шаг

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 02 runtime / 03 CONTENT.
Результат/milestone: оба P1 CLOSED; M5-0 и M1–4 AUTOMATED PASS, full runtime admission в проверенной области.
Куда: 05 →00;03 — дальнейший authoring;07/01/04 информационно;06 — сохранённые primary sources/альтернативы.
Почему: меняется runtime contract и public runtime graph, сохраняя учебный прогресс и Identity/Cloud.
Когда: сейчас, до M5-1 или решения о публикации.
Что передать: source7dfc9d7, CI40276100805 SUCCESS7/7, 37 M5 и768 M1–4 cases, 11 boundary controls, сохранность/Offline, hashes и ADR; main065606a неизменён.
Готовый текст для вставки: «M5-P1-01/02 CLOSED в feature/academy-gold-standard-cpp-module-5. Прежний Clang22 с совместимым WASI SDK33 исполняет стандартные исключения; keyword guard удалён, inspect учитывает browser feature. Повтор M5-0: native/WASM37/37; M1–4:768 случаев PASS; boundary11/11; cold Offline и synthetic50/50/legacy40/40 PASS. Static NEXUS-PERF-01:75/590791 B, outline2/27551 B, Home vendor requests0. CI40276100805 SUCCESS7/7 на7dfc9d7. Дополнение4,4МБ загружается поздно; source/Identity/Cloud/ProjectStore/IDs не переписываются. Main065606a, production и Release/tag не менялись; нового LIVE/physical PASS нет. Полный runtime допущен в проверенной области, M5 Gold пока PLANNED9 тем/18 RUEN. Следующий приоритет03: M5-1 с реальными native/WASM проверками каждого нового C++ пакета; публикацию не начинать».
Что потом: 00 фиксирует milestone/приоритет,05 хранит evidence,03 приступает к M5-1 по отдельному поручению. 07 получает UI/Offline proof и будущий physical/publication gate;01 — доказательство, что entry bundle меняет только runtime metadata, auth source/contracts прежние;04 — ADR/эксперимент. Сообщения в другие чаты не отправлялись.

WHAT WAS PROVED: реальные исключения и корректные литералы, согласованный capability, прежние C++ программы и проектные artifacts, synthetic preservation/cold Offline, performance caps и сохранённый production rollback.

WHAT REMAINS: authoring девяти тем M5/18 RUEN; новые content gates. Публикация и LIVE не разрешены и не выполняются.

NEXT RECOMMENDED BRANCH:03. RECOMMENDED MODE: высокий; runtime architecture/publication — очень высокий.
