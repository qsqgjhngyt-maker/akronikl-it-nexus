# M5 Test.2 — шапка локальной копии: тестовая публикация и приёмка

27.10.2026. STATUS:PASS / FULL LIVE PASS по подтверждению владельца на ПК и телефоне. Официальный Release/тег не создавался.

Опубликована `0.1.7-alpha.2.4.6-ui1a.10.9-test.2` /`ui1a-cpp-gold-module5-test2-header-20261027`. PR[39](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/39), source `eafe3278fffdfe4276e84c8f5b051b4a2dfb9489`, main `d76d1613a1fbf6726d453e40366c306ea502d4c7`. Дерево `1e4ae0840ef6ba2eb0a93f618ba2b81ee9b54b7f` побайтно совпало с проверенной feature. Pages[40459625124](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625124) SUCCESS.

## Результат

M5-07-P2-01 CLOSED LIVE:при ширине до760 px шапка локальной копии использует две строки. Заголовок, меню, язык и настройки сохраняют место; профиль и «Закрыть копию» располагаются ниже. Проверены54 сочетания девяти ширин320–1366, RU/EN и online/locked/unlocked, touch44px, отсутствие пересечений/overflow, клавиатура и возврат фокуса. Код,56 учебных состояний, проект/checkpoint сохраняются в синтетической копии.

ENTRY-GRAPH-P1 сохранён:четыре browser bundles в репозитории синхронизированы с уже действующим исправлением входа. Ревизия BFF до и после — `bbard7va4tkt9a3hvted`, image `sha256:f1fc8e6faf945d12295a28ea0c72af394e756f4a59c307b5aa65cd942a75ced1`; конфигурация эквивалентна. Новый BFF/Worker deployment, миграции, смена тарифа и IAM не выполнялись. Private Node BFF, Identity/Cloud/Project Store, C++ content и compiler source не менялись. Compiler exact graph guard остаётся строгим. Account требует подтверждённый public policy и server account proof.

Две независимые окончательные сборки совпали; manifest3502records. Все4146 прежних immutable файлов сохранены, добавлены263; всего4409. Старое поколение Test.1 не перезаписано. Manifest id/start_url/scope/icons прежние. Full public ZIP содержит4419 файлов, PATCH269, rollback ROOT10; все entries прочитаны повторно и проверены. SDK106МБ в эти пакеты не включён.

NEXUS-PERF-01 AUTOMATED PASS:75модулей/591219B при600000B, outline27476/30000B, labs45357/46000B. Полевые timings не измерялись. Домашняя страница не загружает Gold и компилятор. Исходники учебных зависимостей и stable IDs сохранены:56текущих/40исторических.

## Фактические CI и живые проверки

Все14workflow/40jobs SUCCESS:feature6/18 и main8/22. Полные browser C++ матрицы M1–5 выполнены заново на source и main, включая ожидаемые compile-error controls. Native M5 —48пакетов/172verdicts; source contracts совпадают с принятой базой. Старые PASS не подменяют эти текущие запуски.

| Фаза | Run | Jobs |
| --- | --- | --- |
| feature | [40458292833](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40458292833) | 1/1 SUCCESS |
| feature | [40458292828](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40458292828) | 3/3 SUCCESS |
| feature | [40458292851](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40458292851) | 1/1 SUCCESS |
| feature | [40458292868](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40458292868) | 1/1 SUCCESS |
| feature | [40458289484](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40458289484) | 8/8 SUCCESS |
| feature | [40458289462](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40458289462) | 4/4 SUCCESS |
| main | [40459625399](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625399) | 4/4 SUCCESS |
| main | [40459625445](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625445) | 1/1 SUCCESS |
| main | [40459625418](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625418) | 1/1 SUCCESS |
| main | [40459625392](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625392) | 1/1 SUCCESS |
| main | [40459625404](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625404) | 1/1 SUCCESS |
| main | [40459625414](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625414) | 8/8 SUCCESS |
| main | [40459625398](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625398) | 3/3 SUCCESS |
| main | [40459625124](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40459625124) | 3/3 SUCCESS |

Во время merge дополнительные полные C++ повторы ещё выполнялись. Тестовая публикация опиралась на текущие source/rebuild/native/runtime-boundary/05-07/entry gates и отдельное доказательство точного равенства C++/runtime source с1dd56ca, где уже прошли940verdicts. Исторический CPP_REUSE_GATE.json сохранён. Позднее все текущие feature и main CI завершились SUCCESS; итоговая фиксация40/40 получена после этого, не заранее.

Public LIVE:556anonymous HTTP requests,552 точных asset/SHA256 сравнений на Pages и Gateway,3 guard/update проверки PASS. Проверены все263 новых файла на обоих origin, root документы, шесть файлов прежнего поколения и четыре живых BFF JS. Anonymous Account401/no-store/Vary*, entry200/no-store и реальный version.json?interface-check выбирает Test.2. Один первоначальный503 для EN linked-lists на Gateway восстановился единственным повтором200 с точным SHA256. Исходный FAIL сохранён отдельно; непрерывных retry-циклов не было.

В доступной вкладке владелец выполнил обычный вход до и после публикации. Видимый профиль, показатель завершения и число локальных проектов совпали; штатная кнопка подтвердила «Используется актуальная версия …10.9-test.2». В этой вкладке исходно не было локальных проектов, поэтому такое сравнение не выдаётся за инспекцию содержимого личных работ на других устройствах. Cloud PUSH/PULL, очистки cookies/storage и создания аккаунта не было. Личные screenshots/данные в GitHub не публиковались.

Владелец после checklist:«ПК и телефон: всё работает, данные на месте». Это отдельная ручная приёмка телефона и ПК:шапка, обновление, локальная копия, выход/вход и сохранность данных. Физические измерения агентом и новая автоматическая WebAuthn ceremony не заявляются.

## Откат

Готов и сохранён в GitHub `rollback/cpp-gold-module5-test2-header-prepared-v2-20261027`, commit `3397fe34a8edb3271248fd8a55b3aa330175e689`. Patch `ROLLBACK_M5_HEADER_TEST2_TO_TEST1_KEEP_LOGIN_V2.patch`, SHA256 `13f1fda3f651e16fdca609300c78e377f5181a7ae7dc7e6ee6c06b904d2f60d7`; применение и обращение проверены в отдельном Git index. Меняются только10root/source/version файлов; все4409 immutable bytes и текущий исправленный BFF сохраняются. Git HEAD/index рабочей ветки при подготовке не менялись.

Локальные rollback publication/dependency/version/7Node gates PASS. Настоящий native PWA переход Test.1→Test.2→Test.1→Test.2:5/5PASS, два сохранённых документа, точные ciphertext/IDB, progress/project/source и private cache canary. Это synthetic данные. Remote CI rollback-ветки не запускался, production rollback не применялся. Для отката шапки нельзя переключать BFF на старую неисправную ревизию bbat6i53so6gcelm1r9m. Использовать отдельный PR подготовленной rollback-ветки, без reset/force push и удаления поколений.

Окончательные ZIP и SHA256 — CPP_MODULE5_HEADER_PUBLICATION_EVIDENCE.json. Они являются пакетами тестовой публикации, а не официальным Release.

## Неудачные попытки и ограничения

До merge обнаружен неправильный вложенный releaseCandidate.assetGeneration у первоначального d26c168. Фактический version.json и настоящий updater воспроизвели недоступную кнопку установки; после исправления кнопка доступна и выполняется один явный reload. Добавлены обязательные generation assertions. Две окончательные сборки повторены; первоначальные сборка, ZIP и rollback cc6c299 помечены DEPRECATED_NOT_PUBLISHED. В production они не применялись.

Windows checkout первоначально упёрся в длинные пути:повторен с task-local core.longpaths=true, без изменения глобальных настроек. Whitespace check для новых immutable CRLF bytes не используется для их нормализации:проверяется точное равенство hashes, отдельно source diff check PASS. Старый лишний CI отменён через сохранённую Git авторизацию в памяти, без вывода/сохранения credentials; действующие feature/main проверки не отменялись.

Три скачанных runtime CI ZIP M1/M2/M4 проверены SHA256+CRC. M3/M5 CI SUCCESS и их server digests доступны, но локальные ZIP не получены; утверждения о проверке этих скачанных архивов нет. Полные JSON/logs/пакеты сохраняются локально в outputs/academy-gold-m5-test2-header-20261027. Пользовательские profiles, cookies, keys, фразы и содержимое работ не входят в evidence.

WHAT WAS PROVED:main/Pages/public files exact; шапка и вход/выход подтверждены владельцем на ПК/телефоне;40/40CI и NEXUS-PERF-01 PASS; безопасный rollback готов. WHAT REMAINS:в рамках этой тестовой публикации обязательных действий нет. Официальный релиз и M6 отдельно; полевые timings и учебная эффективность не измерены.

ROUTING CHECK:07→05→00;01/02 — сохранённые контракты;04 — release/evidence и failure-before-publication. Готовые сообщения CPP_MODULE5_HEADER_PUBLICATION_ROUTING_RU.md, автоматически не отправлялись. Есть ли здесь материал для диплома? Да:проверка независимых metadata/worker generations, отрицательный контроль, точный rollback и измеримая матрица UI. Это не измерение учебного эффекта. NEXT RECOMMENDED BRANCH:00. RECOMMENDED MODE:высокий; следующий auth/deployment — очень высокий.
