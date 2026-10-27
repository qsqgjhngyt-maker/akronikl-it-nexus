# Module 6 реализация в feature после разрешения владельца

27.10.2026. STATUS: PARTIAL / IMPLEMENTED / локальные AUTOMATED PASS. Актуальный отчёт `CPP_MODULE6_IMPLEMENTATION_RU.md`, технические условия `studio-build/README_RU.md`. Реализованы typed thread limitation, настоящий Qt C++ target и полный пилот TaskFlow в Project Studio: данные, Stop/Restart, переносимый ZIP, серверные тесты, immutable сдача, назначенный преподаватель и рубрика. Локально11/11 browser E2E,37 unit checks,13 integration groups, native ZIP/UBSan/mutation и static NEXUS-PERF-01 PASS. Остановка настоящего бесконечного C++ callback —351ms в измеренном Chromium; это не универсальный SLA.

Ниже сохранена история требований и M6-0. Её формулировки «не реализовано» и OPEN P1 относятся к прежнему checkpoint. Сейчас P1 закрыт в feature, полный цикл реализован как пилот, новый итоговый CI необходимо зафиксировать отдельно. M6 content/банк итогового экзамена, production runner/store/preview ingress, лицензионный маршрут Qt и приёмка физических устройств остаются незавершёнными. LIVE/FULL LIVE PASS не выданы. Main/production/официальный релиз не менялись.

ROUTING CHECK:02→01/07→05→00/04, готовое сообщение в текущем отчёте. NEXT RECOMMENDED BRANCH:02 совместно03, feature6. RECOMMENDED MODE:очень высокий для runtime/security, высокий/Pro для Content. Есть материал для диплома: архитектура единой среды при переносимых проектах и проверяемой сдаче; измерения не доказывают качество обучения.

---

# Уточнение владельца после M6-0 — 27.10.2026

STATUS: PARTIAL / OWNER REQUIREMENTS CONFIRMED. Основной и обязательный маршрут всех учебных/итоговых работ и их оценки — Nexus. Экспорт в обычные редакторы дополнительный, проекты должны быть переносимы. Прежнее предложение вынести обязательный GUI во внешнюю IDE отменено. Все назначенные GUI-задания должны стать выполнимы внутри Nexus; ограничение нынешнего runtime — задача02, а не условие ухода студента из платформы.

WHAT WAS PROVED: проверка исходников подтверждает многофайловый C++ foundation, .nexus.json source transfer, отсутствие GUI provider и отсутствие подключённого Secure Build; кнопка «Проверить среду» вызывает compiler selfTest, не оценивает итоговый проект. Факты и CI M6-0 ниже сохранены без повторного объявления PASS. WHAT REMAINS: M6-R0 реальный edited-C++ GUI prototype и закрытие P1 → интеграция Project Studio → обычный переносимый архив → сдача/оценка в Nexus. Эти новые функции ещё не реализованы. Конкретный GUI/toolchain/build placement выбрать по эксперименту; никакого сервиса/платежа/deployment этим решением не создано.

Актуальные требования `CPP_MODULE6_NEXUS_REQUIREMENTS.json`, план `CPP_MODULE6_NEXUS_RUNTIME_PLAN_RU.md`; программа/аттестация скорректирована в `CPP_MODULE6_COURSE_FINISH_PROPOSAL_RU.md`. Первоначальный JSON DAG сохраняет историю плана: его guiDecision/внешняя трактовка extensionTopics заменены новым requirement; зависимости, stable ID и source hashes актуальны. Main/production остаются d76/…10.9-test.2; продуктовых изменений нет, официальный релиз не создан.

ROUTING CHECK:03→02/07→01/05→00/04. NEXT RECOMMENDED BRANCH:02 совместно03 в feature6. RECOMMENDED MODE:очень высокий для runtime/security. Есть ли материал для диплома? Да: целевой полный цикл в одной среде при переносимых проектах; архитектурный план и проверенные пробелы, без заявления реализации.

---

## Исторический отчёт M6-0 до уточнения основного маршрута

# MASTER-дополнение: C++ Module 6, M6-0

27.10.2026. STATUS: **PARTIAL**. Аудит завершён; M6-1 не начат, полный runtime admission не выдан. Эта новая подтверждённая фиксация дополняет MASTER30.09 и M5 Test.2, не заменяет исторические LIVE результаты новым feature PASS.

Ветка `feature/academy-gold-standard-cpp-module-6`, база main `d76d1613a1fbf6726d453e40366c306ea502d4c7`. Проверки на `0da00a4dde4d7a52c11701284a52eca39abe0752`; перед ними92c14f0 переносит только документальное закрытие M5. Продуктовые bytes совпадают с main:56 stable IDs, legacy40, Gold55, прежние RU/EN, программы, storage/Cloud/Identity и все публичные поколения. Frontend остаётся …10.9-test.2, generation `ui1a-cpp-gold-module5-test2-header-20261027`. BFF/DB/Worker не менялись. Официального релиза/тега нет.

WHAT WAS PROVED: DAG12 предлагаемых тем (10core+2внешнийGUI),9 проверок валидатора; сохранность state/ProjectStore/Offline на synthetic13 Node-проверках и настоящем browser cold Offline при390/1366px. Все56 записей, код, quiz, VFS, проект и checkpoint сохранены; legacy40/40 и текущий56/56 отдельно. Будущее56/67 смоделировано без регистрации IDs. Реальный host C++20/UBSan34/34; browser21программа/34случая, обязательное ядро31/31. Два известных отсутствующих Qt/C++CLI targets не объявляются поддержанными. Полные source hashes34совпали в native CI/browser CI/local browser. Current regression34/integration13/controller5/entry13 PASS. Rebuild3502manifest PASS. Старые M1–5полные browser matrices перенесены по точной идентичности продукта из ledger14runs/40jobs, не выданы за новый прогон. NEXUS-PERF-0175/591219,outline27476,labs45357PASS; fieldtimings не измерены.

CI40471680590,2jobs SUCCESS подтверждают выполненный аудит. Его runtime RESULT **PARTIAL**, а не полный допуск. Evidence ZIP скачаны, SHA256 проверены,118 локальных файлов перечислены в hash ledger. Secrets/профили/личные данные не публикуются. Реальный вход владельца и физический телефон заново не проверялись, поскольку продукт не изменён и тестовая публикация не разрешена этим этапом.

WHAT REMAINS: M6-P1-01 OPEN — std::thread при capabilities.threads:false получает route:guaranteed и падает с сырым WebAssembly.Exception, providerLimit:false. Нужен узкий contract/diagnostics fix02 без source rewrite и без заявления поддержки потоков. Затем решить GUI-маршрут: внешний Qt-практикум или отдельный browser runtime gate. Текущий Clang/WASI не запускает Qt/Windows Forms; консольная модель не является оконным приложением. Объём12тем и отдельный итоговый блок — предложение, не утверждённый/подготовленный контент.

Рекомендация завершения курса: комплексный экзамен + практическая работа с незнакомым кодом + самостоятельный проект со стартовым набором + защита. Проекты могут развивать существующие tasks/finance/logs без перезаписи работ. Рубрики, веса, продолжительность и попытки требуют пилота; assessment storage/Cloud и сертификаты не реализованы. Полный план `CPP_MODULE6_COURSE_FINISH_PROPOSAL_RU.md`.

ROUTING CHECK:02→03→05/07→00;01/04 и06методическийpilot. Подробности `CPP_MODULE6_PREFLIGHT_RU.md`, машинные факты `CPP_MODULE6_PREFLIGHT_EVIDENCE.json`, SHA256 `CPP_MODULE6_PREFLIGHT_HASHES.json`, готовые тексты `CPP_MODULE6_ROUTING_RU.md`. Сообщения в другие чаты не отправлялись. Есть ли материал для диплома? Да: native/browser capability boundary, DAG и state preservation; выводов о качестве обучения пока нет.

NEXT RECOMMENDED BRANCH:02 совместно03, тот же feature6. RECOMMENDED MODE:очень высокий для runtime; высокий/Pro для Gold authoring и аттестации. Main, production и официальный релиз остаются вне разрешения.
