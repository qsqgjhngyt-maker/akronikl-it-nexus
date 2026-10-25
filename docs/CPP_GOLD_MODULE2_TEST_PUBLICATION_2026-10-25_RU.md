# C++ Gold Module 2 — тестовая публикация 1

25.10.2026. Владелец прямо разрешил тестовую публикацию в main и production, подготовку сборки и точного отката, проверку входа, прогресса и проектов. Официальный Release и тег запрещены этим поручением.

STATUS: IMPLEMENTED — подготовка публикации. CI нового пакета, deployment и LIVE ещё не считаются PASS.

Принятые исходники: `e743bd537c09e8ae5bbf09d72cd5fc4980bc92dd`, feature/academy-gold-standard-cpp-module-2. Приёмка 05/07 и автоматическая регрессия NEXUS-PERF-01 пройдены на этом SHA; физическая и личная приёмка нового Module 2 не проводилась. Последний production/main: `d9249b2e977483718cd67a151f62552296dd51e4` (Module 1 test.2).

Новый тестовый пакет: `0.1.7-alpha.2.4.6-ui1a.10.6-test.1`, generation `ui1a-cpp-gold-module2-test1-20261025`. Полные 12 тем RU/EN: 36 заданий, 12 лабораторных, A/B/C и проект. Gold source, stable IDs, legacy quiz и все storage/Identity/Cloud/Studio/PWA contracts сохраняются. Runtime побайтово соответствует принятому e743bd5; два ранее принятых изменения относительно main — deprecated JSCPP facade и маршрутизация C++ в закреплённый Clang/WASM. Публикация меняет номер в app/shell, metadata и создаёт новое immutable поколение.

Порядок: две штатные одинаковые сборки → точный manifest/source/retained gate → CI feature → PR и CI → merge с проверкой ожидаемых SHA → штатный Pages deployment → публичный readback на Pages и Yandex → auth guards и браузерная проверка. Backend/Worker/D1/Identity deployment не требуется. Политика runtime, версии compiler/ABI и лимиты не меняются.

Откат: сохранить точные опубликованные байты d9249b2 и safety-ветку. При дефекте вернуть новым коммитом только шесть root файлов: index.html, nexus-shell.html, offline.html, version.json, service-worker.js, BUILD_MANIFEST.json. Не пересобирать старое immutable имя, не удалять старые или новые поколения, не переписывать историю и не трогать данные пользователей. Повторить штатный deployment и LIVE readback. Полный патч root rollback и его separate-index проверка хранятся в evidence публикации.

Сохранность: синтетические upgrade/rollback и Online/Offline проверки дополняются сравнением доступной вкладки владельца до/после, когда его обычный вход доступен. Не извлекать credentials/cookies и не очищать storage. Не заменять личный код ради smoke, не создавать новый аккаунт и не выполнять автоматический Cloud PUSH/PULL. Личные данные и скриншоты не публиковать в GitHub.

NEXUS-PERF-01: повторить static budget 75/600000, Home outline из двух JSON без eager Gold/compiler, актуальные media guards. Первый запуск C++ требует существующий compiler payload около 106 МБ. Cold/warm timings прошлого feature-опыта не выдаются за новое field измерение. Ограничения WCAG/AT/Safari и физической приёмки сохраняются до отдельного доказательства.

🔀 CROSS-BRANCH SYNC REQUIRED
Источник: 03/05/07. Результат: разрешённая владельцем тестовая публикация полного Module 2. Куда: 05 → 00 → 07; 02 — принятый runtime; 04 — доказательства. Когда: после CI и LIVE. Что передать: точные feature/merge SHA, deployment, hashes, проверенный откат, объём LIVE и остаток проверки владельцем. Готовый текст: «Module 2 опубликован только после подтверждённых CI и deployment; окончательные SHA и LIVE результаты брать из итогового отчёта публикации. Не переносить прежнюю личную приёмку M1 на новый M2 и не создавать официальный релиз». Что потом: завершить физическую проверку ПК/телефона, обновить 00 и MASTER по фактам.

Есть ли здесь материал для диплома? Да: отделение принятого source от reproducible publication и реального профиля, сохранение stable IDs без миграции и точный обратимый PWA переход. Финальные метрики и ограничения фиксируются после проверок; план не считается PASS.
