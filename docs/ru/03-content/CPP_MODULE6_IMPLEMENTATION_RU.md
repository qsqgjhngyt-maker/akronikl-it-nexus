# C++ Module 6 реализация полного цикла в Nexus

27.10.2026. STATUS: PARTIAL. В feature реализован и локально проверен пилот полного цикла TaskFlow. Публикации и полного допуска Module 6 нет. Учебный контент M6 и итоговый экзамен остаются отдельным этапом после runtime gate.

## Подтверждённые результаты

- M6-P1-01 исправлен: реальное обращение к pthread_create даёт типизированное ограничение runtime, без переписывания кода и ложного обвинения строки программы. Browser/WASI 34/34 и 12 unit checks PASS.
- Настоящие исходный и изменённый C++ проекты собирались Qt/Emscripten, с разными Wasm hashes. Совместимый exception ABI проверен исполнением C++ обработчиков. Ошибочный эксперимент с native Wasm EH для этого готового Qt SDK сохранён как failed experiment.
- TaskFlow редактируется в настоящем Project Studio; доступны GUI, данные, тесты, сдача неизменяемой версии и преподавательская оценка по рубрике. Отдельный Preview site и opaque sandbox защищают аккаунт.
- Полный локальный browser сценарий `application-concurrency`: 11/11 PASS на синтетических аккаунтах студента и преподавателя, включая одну кнопку сохранения в Qt, ширину390, preservation56, отсутствие private API в public SW cache, настоящий бесконечный C++ callback, Stop и следующий запуск с данными. Дополнительно имитирована quota ошибка ProjectStore: UI не сообщает ложное сохранение, несохранённые данные доступны в ZIP и сохраняются после восстановления.
- Native C++20/UBSan из обычного ZIP PASS; CRC, ожидаемый CLI результат и обнаружение намеренной ошибки PASS. Nexus-сессия и Qt для model/CLI/tests не нужны.
- 40 unit checks и 13 интеграционных групп PASS. NEXUS-PERF-01 static PASS: 75 modules / 591219 bytes, outline27476, labs45357; compiler/Qt не входят в первую загрузку. Полевые timings этим не измерены.
- Старые 56 IDs,40 legacy,55 Gold lessons и пользовательские storage/Identity/Cloud/Offline contracts сохранены. Контент M1–5, main, опубликованные поколения и production bundle не менялись.

На промежуточном commit355541f свежие полные browser matrices M1–5 прошли в CI40491449590. Весь тот workflow не был PASS: Qt job выявил permissions SDK wrapper; native job использовал старый M5 publication gate. Оба дефекта исправлены отдельно, прежние gates не ослаблены. Для новой реализации требуется итоговый CI по текущему feature head.

## Проверка окружения CI

CI40520128543 на f11e08f подтвердил полные M1–5:173+182+223+190+172=940 случаев PASS, native34/34, WASI34/34 и encrypted cold Offline. Весь workflow имел FAIL из-за Stop в headless shell. После перевода GUI fixture на полный Chromium CI40524597673/cdcf2be подтвердил Qt original/edited и11/11 полного Nexus сценария, включая Stop1016ms, storage quota recovery и разные аккаунты. Использовался Chromium141.0.7390.37, без принудительных site-isolation flags. Это отдельный успешный эксперимент; прежний FAIL сохранён.

Архивы Qt, native и browser CDC, а также всех пяти матриц f11 скачаны через GitHub connector; SHA256 API/архивов и ZIP CRC совпали. Ни credentials, ни SDK binaries не читались и не публиковались. Итоговый общий прогон cdcf2be ещё завершается; не считается PASS заранее.

При заключительной проверке сервиса исправлены гонки: повторная оценка после await проверяет уже зафиксированный review, отмена побеждает поздний успешный ответ runner, logout отменяет ещё выполняющиеся builds. Три новых unit cases довели локальный набор до40/40; полный E2E11/11 повторён. Полный frontend manifest3506 файлов до/после серверных изменений идентичен. Отдельный текущий feature CI должен подтвердить эти изменения.

Основание различать headless shell и полный Chromium: [официальная документация Playwright](https://playwright.dev/docs/browsers#chromium-new-headless-mode).

## Измерения и границы допуска

Первый Qt O3 build занимал около157 секунд, согласованный development O0 build — около8 секунд локально. Wasm вырос примерно с13.84 до19.92 MB. Это измерение синтетического проекта на этой машине, без обещания production SLA или полной побитовой воспроизводимости SDK. Image ID и hashes сохраняются с каждой сборкой.

AUTOMATED PASS относится к синтетическому Chromium и локальным API. Реальные аккаунты, production GUI service, физические телефоны, Safari/Firefox и экранные дикторы заново не принимались. GUI offline, OS threads, C++/CLI, любые Qt modules сверх проверенного Widgets target не заявляются поддержанными.

До тестовой публикации нужны отдельный постоянный runner/store/preview ingress, backup/retention, лицензионное решение Qt и приёмка05/07 с устройствами. Сейчас feature default OFF, платежи/deployments/main/release вне разрешения. Курсовой финальный экзамен и оценка освоения всего материала не заменяются тестами стартового TaskFlow.

## Evidence и следующие действия

Машинная сводка и hashes будут зафиксированы рядом после итогового CI. Raw evidence хранится локально в `outputs/academy-gold-m6-runtime-20261027`: `application-final2`, `application-v17`, `TASKFLOW_NATIVE.json`, `final-unit.log`, `final-integration.log`, `final-dependencies.log`, `p1`, `qt-accessible` и failed experiments. Private stores, capability URLs, TLS keys и profiles в GitHub не публикуются.

Следующий шаг: завершить CI gate feature, затем отдельная Content приёмка M6 и итоговой аттестации. Подробности реализации и условий подключения: `studio-build/README_RU.md`.

Есть ли здесь материал для диплома? Да: единая среда и переносимость; capability boundary WASI/Qt; изоляция learner code; immutable submissions; роль преподавателя; native/browser experiments и preservation. Результаты не доказывают эффективность обучения — для неё нужен учебный пилот.

🔀 CROSS-BRANCH SYNC REQUIRED

Источник:03 CONTENT PRODUCTION. Результат: пилот TaskFlow в feature Module6, локальные AUTOMATED PASS, без LIVE.

Куда по приоритету:02 runtime/Studio;01 auth/storage/ACL;07 Preview/mobile/accessibility;05 итоговый CI/evidence;00 статусы и следующий этап;04 архитектура и эксперименты. Когда: сейчас, до следующего крупного этапа. Сообщения автоматически в другие чаты не отправлялись.

Готовый текст для вставки: «В feature/academy-gold-standard-cpp-module-6 реализован полный пилот TaskFlow в Nexus: настоящий Qt C++ target, отдельный opaque Preview site, Stop/Restart, VFS data, portable ZIP, серверные тесты, immutable submission и назначенный преподаватель с рубрикой. Локально11/11 E2E,40 unit,13 integration groups, native ZIP/UBSan/mutation и static NEXUS-PERF-01 PASS. Итоговый CI ещё необходимо зафиксировать. Старые IDs/прогресс/контент M1–5 и production сохранены. Это IMPLEMENTED/AUTOMATED, не LIVE и не завершение всего M6. До публикации нужны dedicated runner/store/preview ingress, лицензирование Qt и05/07 на реальных устройствах. Материал04: архитектурные альтернативы, изоляция и hashes версий/экспериментов. Main, production и официальный релиз не изменять».

WHAT REMAINS: итоговый CI, полный M6 content и аттестация, deployment/device gates. NEXT RECOMMENDED BRANCH:02 совместно03, текущая feature6. RECOMMENDED MODE:очень высокий для runtime/security, высокий/Pro для Content.
