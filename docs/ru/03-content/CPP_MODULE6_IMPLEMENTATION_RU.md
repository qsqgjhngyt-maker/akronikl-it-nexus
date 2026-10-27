# C++ Module 6 реализация полного цикла в Nexus

27.10.2026. STATUS: PARTIAL. В feature реализован и локально проверен пилот полного цикла TaskFlow. Публикации и полного допуска Module 6 нет. Учебный контент M6 и итоговый экзамен остаются отдельным этапом после runtime gate.

## Подтверждённые результаты

- M6-P1-01 исправлен: реальное обращение к pthread_create даёт типизированное ограничение runtime, без переписывания кода и ложного обвинения строки программы. Browser/WASI 34/34 и 12 unit checks PASS.
- Настоящие исходный и изменённый C++ проекты собирались Qt/Emscripten, с разными Wasm hashes. Совместимый exception ABI проверен исполнением C++ обработчиков. Ошибочный эксперимент с native Wasm EH для этого готового Qt SDK сохранён как failed experiment.
- TaskFlow редактируется в настоящем Project Studio; доступны GUI, данные, тесты, сдача неизменяемой версии и преподавательская оценка по рубрике. Отдельный Preview site и opaque sandbox защищают аккаунт.
- Полный локальный browser сценарий `application-controls-final`: 12/12 PASS на синтетических аккаунтах студента и преподавателя, включая одну кнопку сохранения в Qt, ширину390, preservation56, отсутствие private API в public SW cache, настоящий бесконечный C++ callback, Stop и следующий запуск с данными. Дополнительно имитирована quota ошибка ProjectStore: UI не сообщает ложное сохранение, несохранённые данные доступны в ZIP и сохраняются после восстановления.
- Native C++20/UBSan из обычного ZIP PASS; CRC, ожидаемый CLI результат и обнаружение намеренной ошибки PASS. Nexus-сессия и Qt для model/CLI/tests не нужны.
- 40 unit checks и 13 интеграционных групп PASS. NEXUS-PERF-01 static PASS: 75 modules / 591219 bytes, outline27476, labs45357; compiler/Qt не входят в первую загрузку. Полевые timings этим не измерены.
- Старые 56 IDs,40 legacy,55 Gold lessons и пользовательские storage/Identity/Cloud/Offline contracts сохранены. Контент M1–5, main, опубликованные поколения и production bundle не менялись.

На промежуточном commit355541f свежие полные browser matrices M1–5 прошли в CI40491449590. Весь тот workflow не был PASS: Qt job выявил permissions SDK wrapper; native job использовал старый M5 publication gate. Оба дефекта исправлены отдельно, прежние gates не ослаблены. Для новой реализации требуется итоговый CI по текущему feature head.

## Проверка окружения CI

CI40520128543 на f11e08f подтвердил полные M1–5:173+182+223+190+172=940 случаев PASS, native34/34, WASI34/34 и encrypted cold Offline. Весь workflow имел FAIL из-за Stop в headless shell. После перевода GUI fixture на полный Chromium CI40524597673/cdcf2be подтвердил Qt original/edited и11/11 полного Nexus сценария, включая Stop1016ms, storage quota recovery и разные аккаунты. Использовался Chromium141.0.7390.37, без принудительных site-isolation flags. Это отдельный успешный эксперимент; прежний FAIL сохранён.

Архивы Qt, native и browser CDC, а также всех пяти матриц f11 скачаны через GitHub connector; SHA256 API/архивов и ZIP CRC совпали. Архивы не содержат credentials или SDK binaries; учётные данные при скачивании не читались. Общий прогон cdcf2be завершился7 SUCCESS/1 CANCELLED: M4 не завершился в45min, его прежний полный PASS подтверждён на f11e08f. Весь cdc workflow не считается PASS.

При заключительной проверке сервиса исправлены гонки: повторная оценка после await проверяет уже зафиксированный review, отмена побеждает поздний успешный ответ runner, logout отменяет ещё выполняющиеся builds. Три новых unit cases довели локальный набор до40/40; полный E2E11/11 повторён. Полный frontend manifest3506 файлов до/после серверных изменений идентичен. Отдельный текущий feature CI должен подтвердить эти изменения.

Основание различать headless shell и полный Chromium: [официальная документация Playwright](https://playwright.dev/docs/browsers#chromium-new-headless-mode).

## Ограничение записи сборки

В первоначальном runner output был writable bind mount, а размер проверялся после выполнения. Он заменён tmpfs96MiB; доверенный backend забирает только разрешённые обычные файлы ограниченным потоком64/96MiB. Реальные Docker пробы подтвердили заполнение tmpfs, отклонение65MiB файла и symlink без записи результата на host. Сборки/отмена используют один180s budget. Определение tmpfs соответствует [Docker documentation](https://docs.docker.com/engine/storage/tmpfs/); это не обещание отсутствия OS swap.

После изменения real original/edited Qt C++ и browser callbacks снова PASS. Первый вариант без SDK entrypoint занимал около85s; восстановление штатного окружения Emscripten снизило измерения до25.170/24.566s. Эти цифры относятся к безопасному runner, прежний8s замер сохраняется как исторический. Полный E2E11/11,40 unit и3 настоящие Docker isolation probes локально PASS после этой правки. Итоговый CI текущего source commit пока ожидается.

## Правильная среда проверки проекта

Для Qt приложения отключён прежний WASI controller и его статический вывод о пригодности runtime. Кнопка «Проверить подключение» проверяет сервис сборки; она не объявляет компилятор проверенным и не загружает консольный toolchain. Обычный проект сохраняет прежний controller, «Проверить среду» и Run. Полный локальный сценарий12/12 PASS включает оба режима,0 лишних Wasm requests при Qt connection check и настоящий положительный запуск консольного C++ проекта. Source diagnostics по итогам Qt build остаются в журнале сборки.

На46eb140 CI40535314563 подтвердил40 unit,3 Docker isolation probes,11/11 GUI E2E, native34/34, WASI34/34 и cold Offline. Архивы этого source SHA скачаны, SHA256/CRC совпали. Последующее исправление controls меняет два frontend файла и проверено локально12/12 плюс13 integration groups/static perf; для него запускается собственный CI. Общие workflows не объявляются PASS до завершения всех jobs.

## Измерения и границы допуска

Первый Qt O3 build занимал около157 секунд, development O0 build до изменения изоляции — около8 секунд локально; актуальный безопасный вариант измерен выше. Wasm вырос примерно с13.84 до19.92 MB. Это измерение синтетического проекта на этой машине, без обещания production SLA или полной побитовой воспроизводимости SDK. Image ID и hashes сохраняются с каждой сборкой.

AUTOMATED PASS относится к синтетическому Chromium и локальным API. Реальные аккаунты, production GUI service, физические телефоны, Safari/Firefox и экранные дикторы заново не принимались. GUI offline, OS threads, C++/CLI, любые Qt modules сверх проверенного Widgets target не заявляются поддержанными.

До тестовой публикации нужны отдельный постоянный runner/store/preview ingress, backup/retention, лицензионное решение Qt и приёмка05/07 с устройствами. Сейчас feature default OFF, платежи/deployments/main/release вне разрешения. Курсовой финальный экзамен и оценка освоения всего материала не заменяются тестами стартового TaskFlow.

## Evidence и следующие действия

Машинная сводка и hashes будут зафиксированы рядом после итогового CI. Raw evidence хранится локально в `outputs/academy-gold-m6-runtime-20261027`: `application-safe-final`, `isolation-final`, `application-final2`, `application-v17`, `TASKFLOW_NATIVE.json`, `final-unit.log`, `final-integration.log`, `final-dependencies.log`, `p1`, `qt-accessible` и failed experiments. Private stores, capability URLs, TLS keys и profiles в GitHub не публикуются.

Следующий шаг: завершить CI gate feature, затем отдельная Content приёмка M6 и итоговой аттестации. Подробности реализации и условий подключения: `studio-build/README_RU.md`.

Есть ли здесь материал для диплома? Да: единая среда и переносимость; capability boundary WASI/Qt; изоляция learner code; immutable submissions; роль преподавателя; native/browser experiments и preservation. Результаты не доказывают эффективность обучения — для неё нужен учебный пилот.

🔀 CROSS-BRANCH SYNC REQUIRED

Источник:03 CONTENT PRODUCTION. Результат: пилот TaskFlow в feature Module6, локальные AUTOMATED PASS, без LIVE.

Куда по приоритету:02 runtime/Studio;01 auth/storage/ACL;07 Preview/mobile/accessibility;05 итоговый CI/evidence;00 статусы и следующий этап;04 архитектура и эксперименты. Когда: сейчас, до следующего крупного этапа. Сообщения автоматически в другие чаты не отправлялись.

Готовый текст для вставки: «В feature/academy-gold-standard-cpp-module-6 реализован полный пилот TaskFlow в Nexus: настоящий Qt C++ target, отдельный opaque Preview site, Stop/Restart, VFS data, portable ZIP, серверные тесты, immutable submission и назначенный преподаватель с рубрикой. Локально12/12 E2E,40 unit,13 integration groups, native ZIP/UBSan/mutation и static NEXUS-PERF-01 PASS. Итоговый CI ещё необходимо зафиксировать. Старые IDs/прогресс/контент M1–5 и production сохранены. Это IMPLEMENTED/AUTOMATED, не LIVE и не завершение всего M6. До публикации нужны dedicated runner/store/preview ingress, лицензирование Qt и05/07 на реальных устройствах. Материал04: архитектурные альтернативы, изоляция и hashes версий/экспериментов. Main, production и официальный релиз не изменять».

WHAT REMAINS: итоговый CI, полный M6 content и аттестация, deployment/device gates. NEXT RECOMMENDED BRANCH:02 совместно03, текущая feature6. RECOMMENDED MODE:очень высокий для runtime/security, высокий/Pro для Content.
