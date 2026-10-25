# C++ Module 3 — тестовая публикация 1

25.10.2026. Владелец подтвердил следующий этап после закрытия feature: тестовая публикация Module 3 в main и production, сборка, откат и проверка сайта. Официальный GitHub Release и тег не создавать. Backend, Worker/BFF, D1, способы входа и тарифы не развёртываются и не меняются.

**STATUS: IMPLEMENTED — подготовка пакета. CI публикационного кандидата, merge, deployment и LIVE ещё требуют фактических результатов.**

Принятый source: `d0477ca9c3f9a9e4da8079abe40ff5a207de8476`, проверенный продуктовый код `62deea3e3afd9d90c8536e84d39cfcf82e89dfd2`. Приёмка 05/07 и NEXUS-PERF-01: AUTOMATED PASS, полный CI40201500993 — 6/6, startup/media CI40201501029 — PASS. 223 C++ случая на native и WASM и 152 перехода к лабораторным проверены. Физический и личный LIVE нового M3 из этого не следуют.

Исходный main/production: `98b884f70c53bac3502b209112d0d3f19e401699`, Module 2 test.2. Новый пакет: `0.1.7-alpha.2.4.6-ui1a.10.7-test.1`, поколение `ui1a-cpp-gold-module3-test1-20261025`.

Публикационный source отличается от принятого M3 только номером версии в `core/app.js` и `core/shell-presentation.js`. Учебные тела, runtime, stable IDs, форматы прогресса, Identity, Cloud и ProjectStore сравниваются с принятым SHA. Metadata обновляет 45 тем, 38 Gold уроков RU/EN, 18 Gold уроков M3 RU/EN. Разрешение владельца не подменяется metadata: `ownerPublicationAuthorized` и `releaseReady` остаются false.

Gate `tools/academy-gold-module3-publication.mjs` привязан к точным accepted/base SHA. Он проверяет все продуктовые source bytes, все исторические immutable blobs, каждый manifest hash/size, равенство source/payload и штатную повторную сборку. Для main/PR отдельный режим M3 выбирается по фиксированным metadata и проверяет весь принятый source; исторические feature и M1–2 проверки остаются. Старые исключения retained generations применяются лишь после побайтной проверки истории. CP-1.1 в этой публикации проверяет принятый M3 source и точный пакет; обычный additive-only режим CP-1.1 сохраняется для остальных изменений. Семантические и контрактные проверки не пропускаются.

CI использует текущий candidate generation/version из конфигурации вместо прежних принудительных QA поколений. Assertions и таймауты не ослаблены. Отдельный publication workflow повторяет source/manifest/rebuild, preservation, PWA upgrade → точный предыдущий snapshot → upgrade, startup и media. CI не выполняет deployment backend.

Сборка готовится дважды в разных каталогах. Прежние опубликованные bytes сохраняются точным snapshot, без пересборки старого immutable имени. Все существующие поколения остаются в Git, а прежнее активное поколение добавляется в retained public authority нового producer. Для отката требуется согласованный возврат source/config/CI/roots к main98b884f новым коммитом с сохранением всех immutable поколений, включая M3. Один root patch не заменяет согласованный rollback. Patch/tree roundtrip и baseline publication/integration gates проверяются отдельно; настоящий production rollback без причины не выполняется.

Порядок: локальные gates и два одинаковых пакета → CI точного feature SHA → PR и его CI → сверка head/base/tree → разрешённый merge → штатный Pages deployment → анонимный readback текущих байтов на Pages и Yandex → обычное обновление доступной вкладки и сравнение аккаунта/прогресса/проектов → отдельная проверка владельцем ПК и телефона.

До публикации владелец вошёл в доступной вкладке. Исходные показатели аккаунта, прогресса и проектов и их сравнение после обновления сохраняются только в локальных приватных evidence. Проверка одной вкладки не переносится на другие устройства. Реальный профиль не экспортируется в GitHub; персональные снимки и идентификаторы остаются локально. Cookies/storage не очищаются, личный код не заменяется, новый аккаунт не создаётся, автоматический Cloud PUSH/PULL не выполняется. Никаких секретов в evidence.

NEXUS-PERF-01: сохранить 75/600000 static budget, два outline JSON, отсутствие eager Gold/compiler в Home. Предыдущие controlled timings не выдавать за field замеры новой production публикации. WCAG/AT/Safari и физическая приёмка имеют отдельные ограничения из feature отчёта.

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03/05/07. Куда: 05 → 00 → 07; 01/02 информационно, 04 — evidence. Когда: после CI, deployment и LIVE. Что передать: точные candidate/merge SHA, runs, hashes, проверенный откат, границы LIVE и результат владельца. Готовый текст: «Module 3 готовится к разрешённой тестовой публикации. Не переносить AUTOMATED PASS в FULL LIVE PASS. Финальные SHA и статусы брать из итогового отчёта после deployment и проверки. Официальный Release/тег и backend deployments запрещены этим поручением». Что потом: завершить проверку владельцем на ПК/телефоне и зафиксировать итог в 00.

Есть ли здесь материал для диплома? Да: отделение принятого source от воспроизводимого пакета и личной приёмки, сохранение 40 legacy IDs при программе из 45 тем, проверяемый PWA upgrade/rollback и строгий контроль scope публикации. Измерения и неудачные опыты сохраняются; запланированное не считается PASS.
