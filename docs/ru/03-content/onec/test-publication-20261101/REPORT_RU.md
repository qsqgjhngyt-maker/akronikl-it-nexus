# Проверочная публикация двух курсов 1С — 01.11.2026

STATUS: PARTIAL общей приёмки / TEST PUBLICATION PASS. Проверочная сборка доступна на основном адресе Nexus всем пользователям с действующим доступом. Официальный Release и main остаются до успешного тестирования.

WHAT WAS PROVED:

- Публикация подтверждена 01.11.2026 в 16:34:56 Asia/Krasnoyarsk (09:34:56 UTC). Версия `0.1.7-alpha.2.4.6-ui1a.10.11.0-rc.1`, generation `ui1a-p4q-onec-candidate-20261101`, активная revision `bbaaf6lfjg3ljk197btv`.
- Product source: `87944bb1adccfb5d7eb41710e39b9df2282f9b97`; evidence head перед публикацией: `e9334500f46fc38f62d3118d77b0a30a8ec96ee4`, exact-head CI 5/5 SUCCESS. Последующий documentation-only commit не меняет опубликованные байты и не объявляется прежним CI.
- Registry manifest `sha256:9de5a3c86937efa5d14bd7f5b0d62ad3d133bcc2a251057e432a63404bddc6e3`; config `sha256:835456f61bb55b23e987fbe67d99b2a7f4371bc8746c90751ee38e991997bda4`; frontend manifest `fdb1f29667a47adaa566bd2670eeaf9f4fc6ed1ea31b4c63a4c6f9c96c853b04`. Config и точные bytes manifest сверены с проверенным локальным image/archive.
- Сохранены оба Course ID: `onec` (P1–P12, 52 темы) и `1c-enterprise` (A1–A8, 32 темы): всего 84 темы / 168 материалов RU/EN. Третьего курса нет. C++67 и прежние IDs, attempts/provenance не переименовывались и не очищались. Нативные работы используют копии; подсветка/JS не выдаются за исполнение 1С.
- Владелец подтвердил три входа, F5 и выход: Passkey, Яндекс, Google. Серверные issuance receipts подтвердили один аккаунт и завершение каждой сессии. Это PRIMARY-origin evidence; его не переименовывают в наблюдение входов на private canary. Пароли, cookies, OAuth code/state и session secret не собирались. До переключения существующий неизменённый guard вернул `PRIMARY_ORIGIN_PUBLICATION_PASS`.
- Дополнительные 27 тестов существующих guards/legacy и modern DTO/deadline enforcement прошли. Новые mode/skip-переключатели не добавлены. Исторические enum-названия receipt сохранены по существующему интерфейсу, scope прямо обозначен как frontend-only overlay, без новой admin/backend migration.
- Добавлены только 12 публичных адресов нового поколения. Все прежние Gateway routes и global settings сохранены; защищённые маршруты не изменены. 10 startup objects сверены по SHA и повторно использованы, существующие объекты не перезаписывались.
- BFF bundle и network bootstrap побайтно прежние. Runtime config hash `2216c244edd908637e3b8e2620d348e88fca7fd9b3e2b7def5ce3a5e59a117d2` сохранён, как и все 12 secret references. Значения secret payload не читались. Worker code/settings и схема D1 совпали до/после. Миграций, ручных записей в D1 и изменений IAM/OAuth не было; три обычных входа владельца естественно создают и закрывают серверные сессии.
- После переключения 11 опубликованных публичных файлов дали ожидаемые bytes/SHA, включая оба curricula, каталог, Studio, URL-map и два native XML. Анонимные Account и shell вернули 401. Итого 13 проверок публикации PASS. Это не приёмка личного сохранения через опубликованный интерфейс.
- Проверенный image содержит 9 973 публичных файла и сохраняет 9 025 прежних immutable records. На локальном Chrome именно собранные 9/12-файловые шаблоны, немедленный F5, сетевой разрыв и повторное открытие прошли с искусственным Account. Имена/байты файлов работ сохранены; ASCII addresses — только producer transport mapping.

## Откат

Исходная revision `bba09u2uovhfc6aiepos`, image `sha256:600caf554f9dacd823160072d40eb0ba9b7b08da4d5672c450b33077f8c7c4d8`, прежнее поколение `ui1a-p4q-production-20261030-v21`. Снимок конфигурации и отпечаток схемы сохранены вне Git. Прежний локальный image прошёл HTTP smoke; фактический production rollback пока не выполнялся.

Подготовлен ограниченный `s8-guarded-rollout.mjs rollback`: проверяет принадлежность активной candidate revision, точный config/Worker/schema/main и восстанавливает прежний image без очистки хранилища браузера или возврата БД. Добавленные публичные маршруты могут остаться. При откате старый каталог может скрыть новые курсы; сохранённые работы остаются для возвращения кандидата. Архивы, snapshot private config, credentials и пользовательские работы в Git не включены.

Основные архивы: frontend ZIP 9 506 968 bytes, SHA256 `ffcf9998a1575c8cf8eb2ceb82460504bb1c81993a5c4cfa7f113fe60c57c24a` (948 entries сверены с source); image tar.gz 301 996 427 bytes, SHA256 `cc48c53c50351dd5fa5819a0aabff6cb5c318ec7834906d69594b0a8170bed10`. Это candidate artefacts, не официальный Release.

## WHAT REMAINS

Настоящий Account/save/F5/reopen и сохранность прогресса должны быть приняты в обычной опубликованной вкладке на ПК. Естественная диктовка и два голосовых цикла ранее подтверждены владельцем в локальном тестовом пространстве; опубликованный вариант отдельно не объявляется LIVE PASS. Исходная временная работа из аварийного QA-контекста не считается восстановленной.

Android/iPhone владелец проверяет после публикации; теперь проверочная сборка для этого доступна. Общая client/server concurrency 1С, EDT, private auth-shell cold-offline, field p95 и педагогическая эффективность не объявляются доказанными. Преподавательские роли/институциональная сертификация не добавлялись. Дополнительные платные сервисы/ресурсы не создавались.

Main сохранён на `d8721e06a2b1ac953aa18694c07559c62d388700`. Merge и официальный Release не выполнялись. После успешной приёмки — согласованный переход в main и официальный Release; до этого статус курса остаётся кандидатом.

## 🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03 CONTENT PRODUCTION / 05 RELEASE EVIDENCE, один поток PR #63.

Результат/milestone: проверочная публикация двух полных направлений 1С на основном адресе с точным откатом и неизменёнными security gates.

Куда: 00/05 — по приоритету; 02/07 — сохранность/Studio/обновление; 04 — материал для диплома. Межчатовые сообщения этим актом не отправляются: владелец выбрал продолжение здесь.

Почему: новый фактический deployment milestone, сохраняющий main и официальный Release до приёмки. Нужна точная граница между automated publication и LIVE PC acceptance.

Когда: сейчас, до следующего крупного этапа приёмки.

Что передать: этот акт, receipt 13 checks, CI5/5 e933450, source87944bb, image9de5a3/config835456, revision bbaaf6lfjg3ljk197btv, rollback600caf; без private config/секретов/работ.

Готовый текст для вставки:

«01.11.2026, PR #63: TEST PUBLICATION PASS / общая приёмка PARTIAL. На основном Nexus опубликована проверочная …10.11.0-rc.1, generation ui1a-p4q-onec-candidate-20261101; source87944bb, evidence e933450, CI5/5. Два Course ID onec и1c-enterprise,84/168RUEN, C++67 сохранён. Три настоящих входа/F5/выход владельца подтверждены server receipts одного аккаунта; неизменённый publication guard PASS. 12 новых публичных routes, защищённые routes/BFF/bootstrap/runtime/12secretrefs/Worker/schema сохранены. После переключения13checksPASS. Revision bbaaf6lfjg3ljk197btv, image9de5a3; точный rollback600caf/исходная revision bba09u2uovhfc6aiepos, без DB downgrade/storage clear. Настоящие save/F5/reopen и голос опубликованной версии ещё требуют PC acceptance. Main d8721e0, merge и официальный Release не менялись; телефоны владелец проверяет после публикации. Работу продолжать одним потоком здесь, без третьего PR».

Что потом: вернуться к опубликованному UI, закрыть приёмку ПК и только затем переходить к main/Release.

Есть ли здесь материал для диплома? Да: frontend overlay с криптографической привязкой к проверенному image, неизменность backend/identity, сохранение historical gates, реальный operator/server login evidence, точный rollback и разделение local/automated/LIVE результатов. Секреты и пользовательские работы исключаются.

NEXT RECOMMENDED BRANCH: текущий 03/05, PC evidence с 07/02. RECOMMENDED MODE: Очень высокий для publication/security; Высокий для content.
