# C++ Module 5 — завершение тестовой публикации и приёмка 05/07

STATUS: PASS. 2026-10-26 17:24:29 UTC. AUTOMATED PASS, публичные файлы LIVE PASS; FULL LIVE PASS на ПК и телефоне по отдельному подтверждению владельца после обновления. Это тестовая публикация, официальный Release/тег не создан.

Версия `0.1.7-alpha.2.4.6-ui1a.10.9-test.1`, поколение `ui1a-cpp-gold-module5-test1-20261026`. Принятый учебный source20b3d1b; фактический publication source `9cce35463fe57489a13611054ea83687132e5c39`, PR38, main `5e0e290c9bf74dde87f3169b9d7e122952fd0c57`. Дерево merge `84a3bea2f887667a1e6155b20df80cf24ed902a1` совпало с проверенным feature и тестовым merge; checkout остался feature. Отчёт фиксируется документальным изменением в feature, дополнительный merge документации в main не выполняется.

WHAT WAS PROVED:

- Девять тем /18 RU/EN Gold-объектов M5 опубликованы; всего56 тем и55 Gold. Прежние50 записей и40 исторических IDs/legacyIndex сохранены. Шесть новых IDs добавлены без перенумерации. Контракты Identity/Cloud/ProjectStore и manifest identity сохранены.
- C++20:48 уникальных M5 пакетов /172 verdicts в native/UBSan и настоящем Clang/WASI. В каждом backend167 успешных исполнений и5 ожидаемых compile errors. WASM M1–5:173+182+223+190+172=940 контрольных verdicts по матрицам, включая ожидаемые отрицательные проверки; это не940 успешных исполнений. Допуск runtime37/37, границы11/11. Исходник ученика не переписывается. Все9 уроков и многофайловый проект проверены через Code Studio.
- Приёмка UI:18 объектов×6 ширин=108 layouts;144 вопроса /288 неверных и верных отправок;55 лабораторных и220 навигационных маршрутов. Текущий PR CI40354643438 SUCCESS; отдельный M5 CI40350519248 на be605d6 SUCCESS повторно связан с9cce по точной неизменности всех product bytes. После merge отдельный M5 main acceptance также SUCCESS.
- PWA upgrade→rollback→upgrade с двумя открытыми документами: синтетические56 учебных состояний, шесть будущих IDs, VFS/quiz, проект/checkpoint и encrypted IndexedDB ciphertext сохранены.36 вариантов входа/ширины/состояния и cold Offline throw/catch проверены. Это synthetic evidence; личные данные автоматически не читались.
- Public LIVE:549 анонимных GET/проверок,546 точных сравнений bytes/SHA256 на Pages и gateway,3 private guards. Неавторизованный Account/Cloud доступ закрыт. Ещё6 GET подтвердили старые M4 bootstrap/catalog/runtime-router. Cookies, ключи и реальные пользовательские работы в эти проверки не передавались.
- Владелец перед обновлением: «проверено». После Test.1: «ПК и телефон: всё работает, аккаунт, прогресс, код и проекты на месте». Это ручная приёмка владельца; агентские screenshots/измерения телефона не заявляются. Автоматизация существующей вкладки Яндекс была остановлена политикой URL браузера; обход не применялся.

## Фактические CI

Перед merge: шесть workflow /15 jobs SUCCESS на9cce. После merge: восемь workflow /21 jobs SUCCESS на5e0e290, включая deployment. Pending, skipped и старый source CI не выдавались за новый PASS.

| Workflow | Run | Jobs | Результат |
| --- | --- | ---: | --- |
| Академия C++ Module 5 — приёмка 05/07 и NEXUS-PERF-01 | [40362363849](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40362363849) | 3 | SUCCESS |
| Академия C++ Module 5 — M5-1, полный контент, прогресс и runtime | [40362329173](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40362329173) | 8 | SUCCESS |
| Академия C++ Gold — Module 2, runtime и регрессия Module 1 | [40362329292](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40362329292) | 3 | SUCCESS |
| CP-1.1 Content Contract | [40362329121](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40362329121) | 1 | SUCCESS |
| pages build and deployment | [40362328630](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40362328630) | 3 | SUCCESS |
| C++ Modules 3/4 — точная тестовая публикация и откат | [40362329131](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40362329131) | 1 | SUCCESS |
| Академия C++ Module 4 — приёмка 05/07 и NEXUS-PERF-01 | [40362329104](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40362329104) | 1 | SUCCESS |
| Академия C++ Gold — модуль 1 | [40362329076](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40362329076) | 1 | SUCCESS |

## NEXUS-PERF-01

PASS в измеренной static/synthetic области:75 модулей /590791 B при caps75/600000; outline2 файла /27476 B при cap30000; лабораторный payload45357 B при cap46000. Home не загружает тела Gold и compiler/vendor. Полный runtime109949111 B, дополнительный EH pack4390769 B, вне public precache. Объём фактического скачивания зависит от уже сохранённых ресурсов. Field/mobile timings и образовательный эффект не измерялись.

## Сборка и откат

Два независимых build совпали. Каждый ZIP повторно открыт; каждый файл проверен по bytes/SHA256. Публичных удалений0,3883 старых immutable файла сохранены. Frontend forward→rollback→forward побайтно; rollback сохраняет263 новых файла поколения.

- `frontend-full`: 4156 файлов, 30087385 B, SHA256 `9d6463356b8fc69296953272c2dd6a4fb6f7e2aaa68fd9a3aa5c38cd0fec0571`.
- `frontend-patch`: 269 файлов, 2352025 B, SHA256 `640478a733ba0c68a86ed9e58d751e4480e5cade0b63caf49bf22f7be4c3777f`.
- `rollback-full`: 4156 файлов, 30057769 B, SHA256 `039eb4645d6459f0f6668708e2954c7a25a3db4eb00f7c1d44fc25a467614f32`.
- `rollback-patch`: 6 файлов, 293549 B, SHA256 `d543e8aa499cdcc5d4ca0a4116207a16212a0747945931aba985e551a82c533f`.

Source rollback: SHA256 `e13aa4fe30dce065c073e4f1ffc157205b09e1a6703f9d95e70487329d812823`, двусторонний patch roundtrip PASS; tree `1acb0c9e398c1efed558f243dda05b5765f9bc2c`, подготовленный remote commit `1af3784bf52b9ecf8bea7405fe042f06f92cbcc4`, ветка `rollback/cpp-gold-module5-test1-prepared-20261026`.4146 immutable файлов сохраняются. Root/source/config/CI возвращаются к M4 Test.2 с единственным узким tooling pin двух точных M5 subtrees; полномочия старого SW не расширяются. Проверки rollback publication/integration/version PASS. Откат не применён. Старый runtime не обязан исполнять новые EH-работы, но их код и прогресс не удаляются.

Пакеты и полные локальные логи: `outputs/academy-gold-m5-publication-20261026/final-9cce354/`. Машинный акт: `CPP_MODULE5_PUBLICATION_EVIDENCE.json`. SHA256 восьми feature artifacts зарегистрированы; native, browser и M5 Gold WASM ZIP повторно проверены локально, UI ZIP be605 также проверен. Остальные artifact digests не выдаются за повторное локальное чтение каждого ZIP. TLS keys, profiles/cache и личные данные не включены.

## Исправленные попытки и ограничения

Первичная подготовка оставила старый номер версии в inline bootstrap shell; consistency gate остановил её. Исправлены только version strings, пересобраны два одинаковых пакета и sealed receipt. Старые M1/CP-1.1 dispatchers не знали M5: FAIL закрытого gate, затем выбор exact M5 proof без снятия hash assertions. M2 regex захватил внешний EH URL вне public config: заменён точным разбором единственного config и сверкой списка/порядка/hashes/bytes/version. Все эти проверки текущего head и main SUCCESS.

Вложенная Windows-копия rollback без core.longpaths дала ложные удаления длинных путей. Тот же tree/patch прошёл с longpaths; исходный FAIL log сохранён, production не затронут. Сохранены failed experiments: проблема→гипотеза→попытка→результат→причина→решение→regression.

Личная сохранность подтверждена владельцем, не выводится из анонимного HTTP. Полноценные EH требуют браузерной поддержки WebAssembly EH; неподдерживаемая среда должна получить честный отказ. Работы, cookies/storage не очищались; принудительного Cloud PUSH/PULL, backend/Worker/BFF deployment, D1 migration и смены тарифа не было.

WHAT REMAINS: открытых P0/P1 в выполненной области нет. Неблокирующее M5-07-P2-01 OPEN VISUAL TRIAGE: в synthetic Offline QA-скрине при390px название Академия и выбор языка стоят вплотную. Требуется воспроизведение baseline/current и проверка общей шапки в07. Четыре header/presentation source пути побайтно совпадают с M4; регрессия M5 и дефект реального телефона этим скрином не заявляются. Подтверждение владельца о работе устройств сохраняется. M6 и официальный релиз требуют отдельного поручения. Исследование результата обучения и field timings остаются отдельными задачами.

ROUTING CHECK:05 evidence →00 milestone →07 закрытие физической приёмки;02 runtime;01 отсутствие auth/Cloud изменений;04 инженерный материал;06 новое исследование сейчас не требуется. Сообщения подготовлены, автоматически не отправлялись.

Материал04: точный feature/main tree, воспроизводимый build, runtime feature probe, настоящий EH вместо переписывания C++, отрицательные контроли, failure injection, immutable rollback и сохранность ciphertext. Альтернатива симулировать исключения/менять код ученика отклонена; цена настоящего пути — дополнительный pack и требования браузера. См. `CPP_MODULE5_RUNTIME_ADR_RU.md`. Из этих проверок не делается вывод об образовательной эффективности.

NEXT RECOMMENDED BRANCH:00 — определить следующий Content этап, затем03 M6-0 отдельным поручением. RECOMMENDED MODE: высокий для Content, очень высокий для runtime/publication gates.
