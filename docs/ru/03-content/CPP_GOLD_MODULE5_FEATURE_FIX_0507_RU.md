# Module 5: повторная приёмка 05/07 и восстановление входа/выхода

27.10.2026. STATUS: PASS в указанных границах. Шапка локальной копии — AUTOMATED PASS, только feature. Вход/выход — FULL LIVE PASS по проверке сервиса и подтверждению владельца на ПК и телефоне. Официального релиза/тега нет; main `5e0e290c9bf74dde87f3169b9d7e122952fd0c57` и frontend production …10.9-test.1 не менялись.

## Что исправлено

Source `1dd56caddc17617c592b69f4ea8719cd20bb29f0`, ветка `feature/academy-gold-standard-cpp-module-5`. Только два продуктовых исходника: `pwa/offline.css` и `pwa/client.js`. Теория, C++ примеры, SDK компилятора, stable IDs, namespace прогресса, Cloud/Identity/Project Store исходники не менялись. Дополнены проверки, CI и доказательство границ QA сборки.

M5-07-P2-01: при ширине до760 px шапка Offline получила две строки; заголовок, язык, настройки и меню перестали теснить друг друга. При390 px расстояние от текста заголовка до элемента справа выросло локально с 0.375 до 138.75 px. Отдельный Linux CI воспроизвёл прежнее пересечение −6.75 px и получил128.78125 px после исправления. Пройдены54 сочетания девяти ширин320–1366, RU/EN и трёх состояний. Проверяются реальные границы текста, цель44 px, отсутствие горизонтального overflow, клавиатура и возврат фокуса. Закрытие/открытие той же synthetic копии сохраняет56 состояний, код, проект и checkpoint. Это не проверка шапки на физическом телефоне; CSS ещё не опубликован.

ENTRY-GRAPH-P1: отдельный BFF отдавал старый bundled entry с графом компилятора `3eb53dcb260f33d040d58e304ae5922c5d842ef3164e3e4a63bae940d3a1efe0`, а действующий SW уже использовал `cb9f8b55bd440758370a2b48efe485735859ec053ec4332367916820c54dcb5c`. Проверка транспорта Account требовала равенства этих версий и зависала после контролируемого выхода. Shift+F5 временно обходил условие отсутствующим controller. Прежняя зелёная приёмка M5 этот сценарий не покрывала; пользовательский дефект признан новой регрессией.

Исправленный Account transport требует известный протокол `nexus-verified-public-v1`, корректный64hex graph и окончательный `publicReady===true`; версию компилятора проверяет отдельно строгий runtime gate. Серверное подтверждение аккаунта остаётся обязательным. Legacy/incomplete/malformed/другой протокол отвергаются. Равенство графа для запуска компилятора сохранено.

## Реальные проверки и CI

| Проверка | Run | Итог |
| --- | --- | --- |
| Академия C++ Module 5 — M5-1, полный контент, прогресс и runtime | [40443998151](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40443998151) | 8 / 8 PASS |
| Академия C++ Module 5 — приёмка 05/07 и NEXUS-PERF-01 | [40443998176](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40443998176) | 4 / 4 PASS |

Все12 jobs завершились SUCCESS на `1dd56caddc17617c592b69f4ea8719cd20bb29f0`. M1–5 WASM940 verdicts выполнены заново, а не переиспользованы из старого main. M5:48 пакетов,172 verdicts на backend, включая5 ожидаемых compile errors. Два скачанных UI/entry CI ZIP проверены по SHA256 и полным ZIP CRC; hashes и IDs находятся в машинном ledger.

Шесть HTTPS/Chrome сценариев: прежний public BFF bundle воспроизводит дефект на390/1366; исправленный client со старым и текущим SDK проходит оба размера. Использованы настоящий SW, bootstrap, logout и серверный401; изолированный login stub восстановил тот же synthetic аккаунт, код, прогресс и проект/checkpoint. Старый private cache canary сохранён, но проигнорирован. Hard reload, очистка cookies/storage и Cloud PUSH/PULL не использованы. WebAuthn ceremony в этих автоматических тестах заменена stub: это не доказательство реальной биометрии. Node проверки:3 совместимости графов,5 controller и13 entry document;4 отрицательных проверки scope;34 regression и13 integration — PASS.

NEXUS-PERF-01 AUTOMATED PASS:75 модулей /591219 B при лимите600000, outline27476/30000 B, индекс практикумов45357/46000 B. Рост относительно базы428 B относится к client.js. Домашняя страница не загружает Gold-контент и компилятор. Полевое время загрузки не измерялось.

QA snapshot из3239 файлов меняет только пять производных public файлов и BUILD_MANIFEST. Он помечен `publishable:false`: перезаписывать прежнюю frontend generation нельзя. Продуктовые файлы опубликованного frontend в репозитории сохранены; CSS остаётся feature.

## Установка исправления входа

Сначала соблюдалось поручение не менять production. После отдельного требования владельца «Исправь уже пожалуйста вход выход!!!» применён только BFF hotfix с готовым откатом. Шапка, main, frontend generation, D1 migrations, Worker, тариф и IAM не менялись.

Рабочая ревизия до изменения `bbat6i53so6gcelm1r9m`, image digest `sha256:14b9275ccef9b68f21e0d99b2b4d3b2797b5c9d84039249b678283dfa8498456` сохранены для rollback. Новый образ построен FROM этого точного digest с единственным COPY четырёх browser bundles. Все исходные слои и image configuration совпали, добавлен один слой. Node BFF `a4ef9868cc05fd5a24e52ca36d85ea95f8f553c86534f4162b8a0cd87f14a635`, HTML/CSS и galaxy.js сохранены побайтно. Это доказано по файлам фактического рабочего образа, а не только repository context.

Активна ревизия `bbard7va4tkt9a3hvted`, digest `sha256:f1fc8e6faf945d12295a28ea0c72af394e756f4a59c307b5aa65cd942a75ced1`; операция `bba5o7l6tk0gd4cpaiqq` завершилась. Все revision options,15 environment entries и10 Lockbox bindings перенесены в памяти и сравнены: эквивалентность подтверждена без вывода/сохранения значений. Приватная серверная логика авторизации не менялась. Метод и параметры сверены с первичной документацией [DeployRevision](https://yandex.cloud/en/docs/serverless-containers/containers/api-ref/Container/deployRevision); для отката подготовлен [Rollback](https://yandex.cloud/en/docs/serverless-containers/containers/api-ref/Container/rollback) на прежнюю ревизию.

Девять live проверок: четыре JS exact SHA256; прежний SW exact SHA256; entry200/no-store; anonymous account401/no-store; registration policy200; authenticate/options200. Последний запрос создал один обычный краткоживущий anonymous challenge; миграций и записи пользовательских работ не было. Cookies, содержимое аккаунта и ключи владельца не читались. Значения Set-Cookie/challenge не сохранены.

Владелец после установки: «Все теперь Ок!», затем «И на телефоне и на ПК». Это закрывает LIVE сценарий входа/выхода на обоих устройствах. Отдельного нового заявления о проверке личного прогресса/проектов в этом раунде нет; его не подменяем прежним подтверждением при публикации M5. Контракты данных сохранены, synthetic preservation PASS.

Важно для следующей публикации: production BFF сейчас содержит точечный слой поверх старого образа; main намеренно прежний. Нельзя повторно развернуть старые bundled `server-access/image/public/*.js` поверх исправления. Включить исходный `pwa/client.js` из feature и заново собрать browser bundles при следующем согласованном BFF deployment. Рецепт слоя — `docs/ru/05-release/ENTRY_GRAPH_HOTFIX_20261027.Dockerfile`; rollback по прежней ревизии подготовлен, не применялся.

## Ограничения и неудачные попытки

Локальный отказ loopback исправлен обычным разрешённым запуском; undefined progress в заготовке заменён реальным progress без ослабления проверки; ошибочный no-store у mock public bytes исправлен до доказательства SW ready; первоначальный текст готовности уже присутствовал в HTML — ожидание заменено на actual handler data-tone и401. Ранние FAIL сохранены. Docker сначала был недоступен, затем доступ восстановлен и реальный образ собран/проверен/опубликован; старый context ZIP не выдаётся за итоговый образ.

WHAT WAS PROVED: шапка AUTOMATED PASS; entry FULL LIVE PASS в подтверждённом сценарии; CI12/12 и NEXUS-PERF-01 PASS; server/config/base layers byte exact. WHAT REMAINS: шапка только feature, её frontend публикация отдельно; M6 не начат; полевые timings и учебный эффект не измерены.

ROUTING CHECK:01→05→00;02/07/04. Готовые сообщения в `CPP_MODULE5_FEATURE_FIX_ROUTING_RU.md`, автоматически не отправлялись. Есть материал для диплома: ADR о независимых версиях public policy и компилятора, причинное воспроизведение, ограничения и измеримые результаты; это не эксперимент эффективности обучения. NEXT RECOMMENDED BRANCH:00 — зафиксировать milestone, затем03 M6 только по отдельному поручению. RECOMMENDED MODE:высокий; последующие auth/deployment — очень высокий.
