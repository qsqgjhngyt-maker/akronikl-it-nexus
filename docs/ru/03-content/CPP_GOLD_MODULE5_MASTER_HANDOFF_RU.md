# M5 Test.2 — завершение тестовой публикации шапки локальной копии

27.10.2026. STATUS:PASS / FULL LIVE PASS по владельцу на ПК и телефоне. Эта новая подтверждённая фиксация дополняет MASTER30.09 и записи ниже; sources остаются read-only. Main d76d1613a1fbf6726d453e40366c306ea502d4c7 /PR39, source eafe3278fffdfe4276e84c8f5b051b4a2dfb9489, версия …10.9-test.2. Дерево 1e4ae0840ef6ba2eb0a93f618ba2b81ee9b54b7f совпало с feature; официальный Release/тег не создан.

WHAT WAS PROVED:M5-07-P2-01 CLOSED LIVE; шапка54layouts/keyboard/touch44PASS. ENTRY-GRAPH-P1 сохранён, BFF bbard7va4tkt9a3hvted /sha256:f1fc8e6faf945d12295a28ea0c72af394e756f4a59c307b5aa65cd942a75ced1 и конфигурация прежние. Все14workflow/40jobs SUCCESS, включая новые полные M1–5browser matrices. NEXUS-PERF-01 75/591219PASS. Public556requests/552exact assets/3guardsPASS; единственный503 восстановился одним retry с сохранением FAIL. Владелец:«ПК и телефон: всё работает, данные на месте». Обычный вход после публикации и actual updater …10.9-test.2 проверены в доступной вкладке; личные работы не читались.

WHAT REMAINS:обязательных действий по этой тестовой публикации нет. Откат3397fe34a8edb3271248fd8a55b3aa330175e689 /веткаv2 подготовлен и проверен, сохраняет4409immutable и текущий BFF, не применялся. Старые d26/cc6 и первоначальные ZIP не опубликованы. Полевые timings/учебная эффективность не измерены. M6 и официальный релиз отдельно.

ROUTING CHECK:07→05→00;01/02/04. Полный отчёт CPP_GOLD_MODULE5_HEADER_PUBLICATION_RU.md, ledger CPP_MODULE5_HEADER_PUBLICATION_EVIDENCE.json, готовые сообщения CPP_MODULE5_HEADER_PUBLICATION_ROUTING_RU.md. Отправки в другие чаты нет. NEXT RECOMMENDED BRANCH:00. RECOMMENDED MODE:высокий; auth/deployment — очень высокий.

---

## История до публикации Test.2

# Module 5: исправления 05/07 и входа/выхода — 27.10.2026

STATUS:PASS в заявленных границах. Новая подтверждённая фиксация дополняет MASTER30.09 и прежние записи ниже. Source `1dd56caddc17617c592b69f4ea8719cd20bb29f0` в feature. Main `5e0e290c9bf74dde87f3169b9d7e122952fd0c57`, frontend …10.9-test.1 и официальный релиз не менялись; synced sources остаются read-only.

WHAT WAS PROVED: M5-07-P2-01 AUTOMATED PASS54layouts/keyboard/preservation, CSS только feature; ENTRY-GRAPH-P1 FULL LIVE PASS по public9checks и владельцу «Все теперь Ок!», «И на телефоне и на ПК». BFF revisionbbard7va4tkt9a3hvted /digestf1fc8e6faf945d12295a28ea0c72af394e756f4a59c307b5aa65cd942a75ced1 установлен после отдельного требования восстановить живой вход. Изменены4browserJS, server/config/base layers сохранены. CI40443998151 и40443998176 —12/12SUCCESS; новые M1–5 WASM940verdicts; NEXUS-PERF-01 75/591219PASS. Прежняя приёмка пропустила cross-generation logout; новая regression его воспроизводит и закрывает.

WHAT REMAINS:шапка не опубликована; личный прогресс/проекты в этом раунде отдельно не инспектировались, не заявлять новую такую проверку. Миграций и Cloud PUSH/PULL нет. M6 не начат. Следующая BFF сборка не должна вернуть старый bundled client из main; включить feature fix. Rollback прежняя ревизияbbat6i53so6gcelm1r9m готов, не применён. Полевые timings/учебная эффективность не измерены.

ROUTING CHECK:01→05→00;02/07/04. Отчёт CPP_GOLD_MODULE5_FEATURE_FIX_0507_RU.md, ledger CPP_MODULE5_FEATURE_FIX_EVIDENCE.json, ADR CPP_MODULE5_ENTRY_GRAPH_ADR_RU.md, готовые сообщения CPP_MODULE5_FEATURE_FIX_ROUTING_RU.md. Автоматической внешней отправки нет. NEXT RECOMMENDED BRANCH:00; следующий этап03 только отдельно. RECOMMENDED MODE:высокий; Identity/deployment очень высокий.

---

## История до обнаружения регрессии входа

# C++ Module 5 Test.1 — завершение тестовой публикации

2026-10-26 17:24:29 UTC. STATUS:PASS. Новая подтверждённая фиксация дополняет канонический MASTER30.09.2026; synced sources read-only не меняются. M5 …10.9-test.1 опубликован main `5e0e290c9bf74dde87f3169b9d7e122952fd0c57` (PR38, source `9cce35463fe57489a13611054ea83687132e5c39`); tree `84a3bea2f887667a1e6155b20df80cf24ed902a1` совпал с feature. Официальный Release/тег не создан.

WHAT WAS PROVED:feature/PR шесть workflow15jobs и main восемь workflow21jobs SUCCESS; Pages40362328630 SUCCESS. Public549 проверок и6 старых файлов PASS. Девять Gold-уроков RU/EN,56 тем/55Gold; прежние50 записей и40 исторических IDs сохранены. M5 native/WASM48пакетов172verdicts; M1–5 WASM940verdicts, включая отрицательные compile controls. 05/07 и NEXUS-PERF-01 AUTOMATED PASS; field timing не измерен. Владелец после обновления: «ПК и телефон: всё работает, аккаунт, прогресс, код и проекты на месте» — FULL LIVE PASS по ручному подтверждению владельца.

WHAT REMAINS:открытых P0/P1 нет; M5-07-P2-01 OPEN VISUAL TRIAGE — тесная шапка synthetic Offline390, отдельное воспроизведение/spacing review в07. С реальным телефоном владельца этот скрин не смешивается. M6 не начат; официальный релиз отдельно. Rollback commit1af3784 с сохранением4146immutable файлов подготовлен и проверен, не применён. Backend/D1/тариф не менялись; Cloud PUSH/PULL и очистки личных данных не было. Учебная эффективность не измерялась.

ROUTING CHECK:05→00→07;02/01/04 информационно,06 отдельно не требуется. Готовые сообщения CPP_MODULE5_PUBLICATION_ROUTING_RU.md, не отправлены автоматически. Полный отчёт CPP_GOLD_MODULE5_PUBLICATION_RU.md, ledger CPP_MODULE5_PUBLICATION_EVIDENCE.json. Новые документы фиксируются только в feature, дополнительной публикации main для них нет.

NEXT RECOMMENDED BRANCH:00 — определить следующий приоритет;03 M6-0 по отдельному поручению. RECOMMENDED MODE:высокий;runtime/publication — очень высокий.

## История: подготовка до разрешения владельца

# Локальная подготовка тестовой публикации C++ Module 5

26.10.2026. STATUS:PARTIAL — LOCAL AUTOMATED PASS / OWNER APPROVAL PENDING. Принятый source20b3d1b и его05/07 PASS сохранены. Из документального `e72a2988eab19575a39131eac1a67a4524d40400` отдельно собран `0.1.7-alpha.2.4.6-ui1a.10.9-test.1` / `ui1a-cpp-gold-module5-test1-20261026`. Это не новая публикация или новый CI.

WHAT WAS PROVED:два одинаковых build; исторический frontend rollback побайтно; четыре ZIP FULL/PATCH/rollback с повторной проверкой каждого файла; source/config/CI rollback с сохранением4146 immutable файлов и отдельным tooling pin; Git patch roundtrip. PWA M4→M5→M4→M5 PASS5/5,56 записей/шесть будущих ID, ciphertext, проекты/checkpoint и VFS сохранены. UI18/108,144/288; runtime/preservation36 и настоящий cold Offline throw/catch stdout7 PASS. Реальные владелец/Account/Cloud не использовались.

WHAT REMAINS:отдельное разрешение main/production; интеграция M5 publication mode и CI фактического publication commit в feature; финальная привязка source rollback к нему; merge/deploy и личная/физическая приёмка. Source overlay пока только в отдельной копии. Main `065606a788198045cadf250fea663246ddbb2d56`, production …10.8-test.2 и официальные релизы/теги не менялись. Предыдущий source CI11/11 не выдавать за CI новой версии. M6 не начинался.

ROUTING CHECK:05→00;02/01/07/04. Отчёт `CPP_GOLD_MODULE5_PREPUBLICATION_RU.md`; ledger `CPP_MODULE5_PREPUBLICATION_EVIDENCE.json`; полный текст `CPP_MODULE5_PREPUBLICATION_ROUTING_RU.md`. Локальные пакеты:outputs/academy-gold-m5-prepublication-20261026/delivery. NEXT RECOMMENDED BRANCH:00→05 после решения владельца. RECOMMENDED MODE:Очень высокий.

---

## История до локальной подготовки публикации

# Приёмка 05/07 — финальный source20b3d1b

26.10.2026. STATUS:PASS — AUTOMATED PASS. Source `20b3d1bb9f8245cea4b12b6ffd2ee0592751e36b`, CI40319377951 SUCCESS 8/8 и 40319377958 SUCCESS 3/3. Редакторское ревью ассистентом, оба P2 CLOSED. Отчёт `CPP_GOLD_MODULE5_ACCEPTANCE_0507_RU.md`, ledger `CPP_MODULE5_ACCEPTANCE_0507_EVIDENCE.json`, готовая маршрутизация `CPP_MODULE5_ACCEPTANCE_0507_ROUTING_RU.md`.

WHAT WAS PROVED:9 Gold тем/18 RUEN; все 144 вопроса /288 отправок;108 расположений;220 переходов; практика 110 RUEN объектов. 48 C++ пакетов/172 native+WASM случая (167 выполнений и 5 ожидаемых compile-failure в каждом механизме), M1–4 ещё 768 случаев. 37 runtime admission,11 boundary, Offline36. Старые 50 строк/legacy40, code/stdin/quiz/VFS/projects/checkpoints сохранены на SYNTHETIC данных. Отрицательный контроль проекта: reference PASS12/exit0; commit-before-throw mutant две FAIL/exit1. NEXUS-PERF-01 PASS в измеренной области:75/590791 B; outline2/27476 B; Home vendor requests0. Все 11 artifacts SHA256 проверены.

WHAT REMAINS:отдельное решение о тестовой публикации M5 с новым immutable generation, rollback и проверкой владельца на ПК/телефоне. QA build под старым generation публиковать нельзя. Main `065606a788198045cadf250fea663246ddbb2d56`, production …10.8-test.2 и официальные релизы/теги не изменялись. Нового LIVE/FULL LIVE PASS, физической проверки и образовательного эксперимента нет. M6 не начинался.

ROUTING CHECK:03→05/07→00;02/01/04 информационно. Есть материал для диплома: source/contract parity, Offline и отрицательный контроль, границы измерений; не приписывать эффективность обучения. NEXT RECOMMENDED BRANCH:00. RECOMMENDED MODE:Высокий; публикация — Очень высокий. Последующий commit только документальный.

---

## История до закрытия приёмки 05/07

# MASTER HANDOFF: C++ Module 5 — M5-1 AUTOMATED PASS

26.10.2026. **STATUS: PASS — AUTOMATED PASS.** Проверенный source `b80fbfa4682e4cbaffa723650b1652d66b3b1112`. [CI 40298291111](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40298291111) — SUCCESS — 8/8. Последующий commit отчётов только документальный. Main `065606a788198045cadf250fea663246ddbb2d56`, production …10.8-test.2 и официальные релизы не менялись.

WHAT WAS PROVED: 9 Gold-уроков / 18 объектов RU/EN, 34 редакционных сессии, 72 раздела теории на локаль, 18 примеров, 54 задания, 9 лабораторных, 2 накопительных практикума и проект. 48 исполняемых пакетов /172 случая — PASS одновременно native g++13.3 C++20/UBSan и настоящим Clang/WASI. Пять случаев — ожидаемые compile-error, 167 — положительные исполнения. Source и полный contract SHA256 совпали; исходник не переписывается.

Полный CI повторил runtime — 37, boundary — 11, M1–4 (173+182+223+190=768 случаев), 34 группы регрессии, 13 интеграций, 39 прежних node tests +5 M5 content tests. Синтетическая сохранность: 12 групп, актуальные 56 тем, прежние 50 завершений и legacy 40/40. Encrypted cold Offline: 4 группы, 36 сочетаний девяти M5 ID online/offline×1366/390; настоящий двух-TU C++ с исключением. Личный профиль владельца не читался.

Дополнительный UI smoke: 18 RU/EN объектов online/cold Offline, 108 layout сочетаний 320…1440, словарь/focus/клавиатура/AX tree PASS. Текущие 110 RU/EN объектов M1–5: 140 групп/1208 контрольных случаев и 660 responsive проверок PASS. Рабочее окно M5: 24 открытия/возврата, мобильные вкладки и реальный C++ запуск; редактор, проекты и прогресс сохранены. Проект: 9 навыков, 3 TU, 29 входных/файловых случаев, драйвер 12 проверок, явное сохранение отчёта и свежий импорт. Это автоматизированный smoke, независимая приёмка 05/07 ещё не закрыта.

NEXUS-PERF-01 в проверенной области PASS: 75 модулей/590791 Б (caps 75/600000); outline 2/27476 Б (cap 30000); Home document Gold/compiler 0, context/SW runtime requests 0. Пакет EH вне public precache; runtime и auth bytes не изменены со времени M5-P1. Индекс лабораторных вне Home: 45357 Б без форматирования, bounded budget 46000 для 55 Gold тем. Прежние 46 записей неизменны. Field timing и образовательная эффективность не измерялись.

26 content paths проверены по SHA256, все 50 прежних curriculum rows и старые baseline RU/EN объекты сохранены. В QA build 2996 файлов: 2968 прежних одинаковы, 18 Gold JSON добавлены, 10 файлов изменены (8 разрешённых content payloads, SW и manifest), 0 удалено. Root version/HTML, auth bundles и runtime bytes прежние. QA build под старым generation предназначен только отдельному профилю; будущая публикация обязана использовать новый immutable ID.

Авторское ревью до закрытия: добавлен явный utility; запрещена копия Resource/Guard и добавлен compile-failure контроль; заготовки Window/Rule/Board согласованы с задачами; проверка словаря раскрывает закрытую подсказку перед фокусом. Ранние 46/170 и 47/171 — исторические результаты, не подмена итогового 48/172.

WHAT REMAINS: независимая 05/07 приёмка полного кандидата M5; затем отдельное решение владельца о публикации, новом поколении и rollback. Нового LIVE/FULL LIVE PASS нет, физических устройств нет, автоматическая оценка ученика не реализована.

ROUTING CHECK: 03→05/07→00; 02/01 информирование о сохранённых контрактах; 04 материал о безопасном расширении программы и одинаковых RU/EN исполняемых контрактах. Готовые сообщения — `CPP_MODULE5_M5_1_ROUTING_RU.md`. NEXT RECOMMENDED BRANCH: 05/07. RECOMMENDED MODE: Высокий.

Машинный ledger: `CPP_MODULE5_M5_1_EVIDENCE.json`. Локальный пакет содержит восемь проверенных CI архивов, source parity, screenshots только SYNTHETIC, логи/методы, failed experiments и индекс SHA256. Профили браузера, TLS keys, runtime cache и личные данные исключены.

---

## История этапов до M5-1

Следующие фиксации сохранены как история. Актуальный приоритет и статус указаны выше.

# MASTER HANDOFF: C++ Module 5 — оба P1 закрыты, runtime допущен

26.10.2026. Новейшая подтверждённая feature-фиксация: **STATUS PASS — AUTOMATED PASS** для M5-P1 closure / повтор M5-0 / регрессии M1–4. M5-P1-01/02 CLOSED. Проверенный source `7dfc9d7378e57899cb8d5087c850a5089cfe83f8`, CI40276100805 SUCCESS7/7. Это дополняет MASTER от30.09.2026 и закрытую M4 Test.2; synced sources не меняются. Последующий commit отчёта только документальный.

WHAT WAS PROVED: прежний Clang22 + совместимый WASI SDK33 исполняет standard native EH; keyword guard удалён, capability соответствует browser feature. Native/WASM37/37, восемь EH случаев, 11 boundary controls, настоящие кнопки Code Studio на1366/390 и encrypted cold Offline с исключением PASS. M1–4 полностью повторены на новом runtime:173+182+223+190=768 случаев PASS, с сохранёнными394 RUEN alias records M1. 34 regression groups,13 integrations,39 node tests PASS. Прогресс/код/VFS/проекты/checkpoints на synthetic50/50 и legacy40/40 сохранены. Личные данные владельца не читались; нового LIVE/physical PASS нет.

NEXUS-PERF-01 в измеренной области PASS:75 модулей/590791 B при caps75/600000, outline2/27551 B при cap30000. Home vendor requests0; пакет4390769 B вне public precache, общая подготовка runtime109949111 B (+4,16%). Field timing не измерялся. Новых GoldM5 объектов0; curriculum50/legacy40 и все учебные bytes прежние. M5 остаётся PLANNED9 тем/18 RUEN.

Source patch ограничен четырьмя runtime путями по точным SHA256; остальные Identity/Cloud/ProjectStore/storage, root metadata и immutable generations сохранены. В сгенерированных QA entry bundles отличается только runtime metadata. Исторический M4 build из main065606a воспроизведён полностью. QA build не является новым production поколением. Main `065606a788198045cadf250fea663246ddbb2d56`, production …10.8-test.2, официальный Release/тег и backend не менялись.

WHAT REMAINS: M5-1 — девять полноценных Gold тем /18 RUEN и их отдельный content/native/WASM gate. Публикация запрещена текущим поручением; publication/rollback/physical LIVE этап требует отдельного решения владельца.

ROUTING CHECK:02/03 →05 →00;07/01/04 информационно;06 primary sources/альтернативы сохранены. Полный готовый текст в `CPP_GOLD_MODULE5_P1_CLOSURE_RU.md`, сообщения не отправлялись. Для04 есть ADR, before/after, ABI/source privacy, finite matrix и byte metrics; эффективность обучения не приписывать.

Evidence: `CPP_MODULE5_P1_CLOSURE_EVIDENCE.json`, `CPP_MODULE5_RUNTIME_SCOPE.json`, `CPP_MODULE5_RUNTIME_ADR_RU.md`, CI40276100805 и каталог `outputs/academy-gold-m5-runtime-fix-20261026` с семью ZIP artifact digests, полными результатами и failed experiments. TLS keys, profiles, runtime cache и реальные learner data не включать в package/GitHub.

NEXT RECOMMENDED BRANCH:03. RECOMMENDED MODE: высокий; runtime architecture/publication — очень высокий.

## Предыдущая фиксация: первоначальный M5-0 PARTIAL

26.10.2026. Новая подтверждённая feature-фиксация дополняет MASTER от 30.09.2026 и закрытую приёмку M4 Test.2. Synced sources read-only. Это не закрытие M5 и не разрешение публикации.

**STATUS: PARTIAL.** Аудит M5-0 полностью выполнен на `043cb31dbf87c3e425088698e4246eb85df600fe` в `feature/academy-gold-standard-cpp-module-5`. Два P1 открыты; полный M5 NOT_ADMITTED. Последующая фиксация отчёта только документальная. Main остаётся `065606a788198045cadf250fea663246ddbb2d56`, production …10.8-test.2 не менялся. Merge main, deployment, официальный Release и тег не выполнялись.

WHAT WAS PROVED:

- План 9 тем / 18 будущих RU/EN объектов; DAG без пропущенных prerequisites. Три существующих ID/legacyIndex/order сохранены, шесть редакционных ключей не выданы за progress IDs. Curriculum 50, legacy 40. Шаблоны не требуют EH как жёсткую предпосылку. Gold M5 ещё PLANNED.
- AUTOMATED PASS: 11 synthetic preservation групп, 12 online/cold Offline сочетаний для прежних трёх M5 IDs в двух viewport, реальный многофайловый Code Studio и encrypted ProjectStore/checkpoint. Личный аккаунт владельца/Cloud не читался и не менялся; нового LIVE PASS нет.
- Native g++13.3/C++20/UBSan: 25 программ / 31 случай PASS, включая три отрицательных compile controls. Browser: 27 capability PASS (24 исполнения и три отрицательных compile controls), три EH UNSUPPORTED, один неверный отказ raw literal. Source/contract hashes и локальный/CI результаты сопоставлены.
- Регрессия M1–4: 34 группы, 13 интеграционных групп, 10 node tests PASS. NEXUS-PERF-01 в проверенной static области PASS: 75 модулей / 590301 B; outline 2 / 27551 B. Home не тянет Gold/compiler. Field timing и physical mobile не измерялись.
- Полная сборка: все 2977 файлов совпадают с принятой M4 Test.2, product diff пуст. Новые изменения — только средства проверки, feature-only CI и документы.

CI40273064360 завершён FAILURE: invariants SUCCESS, native SUCCESS, browser FAILURE на строгом runtime admission; независимый preservation step SUCCESS. Красный gate не скрыт и не считается AUTOMATED PASS всего модуля. Три artifact ZIP проверены по SHA256.

WHAT REMAINS:

1. **M5-P1-01:** inspect обещает `guaranteed` для EH, run отвергает его. Нужны честный контракт и отдельный доказанный путь EH для полной темы исключений. Одно переименование label не завершает допуск M5.
2. **M5-P1-02:** guard принимает `throw` внутри допустимого raw literal за C++ token и блокирует компиляцию. Исправить разбор комментариев/литералов без изменения исходника ученика, сохранить реальные negative EH controls.
3. После исправлений — повтор M5-0, M1–4 и NEXUS-PERF-01. До решения runtime gates M5-1 не начинать.

ROUTING CHECK: 02 → 05 → 00; 07/04 информационно; 06 при исследовании EH toolchain; 01 contracts unchanged. Полный готовый текст routing находится в `CPP_GOLD_MODULE5_M5_0_RU.md`; в другие чаты не отправлялся. Для 00 следующий приоритет — runtime, а не Gold-authoring/публикация. Материал для 04: curriculum DAG, host/browser parity, expected unsupported против дефекта, независимый preservation gate и ограничения эксперимента; эффективности обучения не приписывать.

Evidence: `CPP_MODULE5_M5_0_EVIDENCE.json`, CI40273064360, локальный каталог `outputs/academy-gold-m5-0-20261026`. Не включать runtime cache/TLS keys/browser profiles/реальные данные в GitHub или evidence package.

NEXT RECOMMENDED BRANCH: 02. RECOMMENDED MODE: высокий; очень высокий при runtime/EH architecture.
