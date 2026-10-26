# Подготовка тестовой публикации M5 — маршрутизация

Сообщения подготовлены, автоматически не отправлялись.

🔀 CROSS-BRANCH SYNC REQUIRED
Источник:03/05
Результат/milestone:локальные сборка/откат/QA M5 готовы; общий статус PARTIAL
Куда:00, затем05;02/01/07/04 информационно
Почему:определить разрешение на изменение main/production, не смешивая локальные проверки и LIVE
Когда:сейчас, до публикации
Что передать:версию, SHA256 пакетов, приёмку исходного source, новые локальные проверки и невыполненные gates
Готовый текст для вставки:

C++ Module 5: локально подготовлен …10.9-test.1 / ui1a-cpp-gold-module5-test1-20261026 из принятого20b3d1b (документальный e72a298). Два build одинаковы; FULL/PATCH и frontend rollback проверены по SHA256; source/config/CI rollback с сохранением будущих immutable файлов проверен локально. PWA upgrade→rollback→upgrade,56 учебных записей, VFS, проект/checkpoint и ciphertext сохранены на SYNTHETIC данных. UI18/108,144/288 и настоящий cold Offline C++ PASS. Main065606a и production …10.8-test.2 не менялись. Общий статус PARTIAL: новое publication mode/CI, финальная привязка source rollback, разрешение владельца и личный/физический LIVE ещё впереди. Официальный Release/тег не создавать. Отчёт CPP_GOLD_MODULE5_PREPUBLICATION_RU.md, ledger CPP_MODULE5_PREPUBLICATION_EVIDENCE.json.

Для02:старый runtime при rollback не обязан поддерживать новые EH-работы; исходники/прогресс сохраняются, не переписывать C++ ради PASS.
Для01:online API корректно отказал Offline identity; метод QA исправлен без ослабления auth. Реальные Account/Cloud не использовались.
Для07:локальный новый PWA generation прошёл цикл с двумя документами и108 layouts; физических устройств ещё нет.
Для04:воспроизводимость, exact future subtree preservation, двусторонние patches и ciphertext evidence; образовательный эффект не заявлять.

Что потом:после отдельного разрешения —05, строгая интеграция/CI и финальный rollback перед main; затем публикация и личная приёмка ПК/телефона. M6 автоматически не начинать.
