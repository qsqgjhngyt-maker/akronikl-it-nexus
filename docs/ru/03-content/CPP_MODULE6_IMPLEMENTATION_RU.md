# C++ Module 6 технический пилот и следующая работа

28.10.2026. **STATUS: PARTIAL для всего Module6 / AUTOMATED PASS технического пилота.** В feature реализован полный проверяемый цикл TaskFlow в Nexus. Сами12 Gold-уроков и итоговая аттестация ещё не подготовлены. Main, production, платежи и официальный релиз не менялись.

## Что реализовано

Настоящее Qt C++ приложение собирается из редактируемых исходников и запускается внутри Project Studio. Доступны данные приложения в VFS, Stop/Restart, пользовательские тесты, переносимый ZIP, сдача неизменяемой версии и назначенный преподаватель с рубрикой/обратной связью. Автотесты модели не выставляют итоговую оценку и не подтверждают освоение курса.

Preview использует отдельный HTTPS site и opaque sandbox; доступа к аккаунту в iframe нет. Сборка выполняется без сети и привилегий, с ограничениями CPU/memory/PIDs/time. Результат сначала пишется в tmpfs96MiB без writable host bind mount, затем передаётся доверенному backend ограниченным потоком64MiB/файл и96MiB всего. Проверены отказы при превышении квоты, слишком большом файле и symlink. Temporary storage соответствует [Docker tmpfs documentation](https://docs.docker.com/engine/storage/tmpfs/), включая возможный OS swap.

Закрыты гонки повторной оценки и позднего результата отменённой сборки. При ошибке локального сохранения UI показывает отказ; несохранённые данные можно забрать в ZIP и сохранить после восстановления. Проверка подключения Qt не запускает прежний WASI controller и не скачивает консольный компилятор. Обычный консольный проект сохраняет собственную самопроверку и реальный Run.

M6-P1-01 закрыт: фактический pthread_create в WASI даёт типизированное ограничение среды без переписывания исходника и ложного обвинения строки. OS threads в этом browser target не заявляются поддержанными.

## Что доказано

Source `2a737915f8a7068dea4d0b2d8cd3b79accb15952`, [CI40542759814](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40542759814): **8/8 SUCCESS**.

- 40 unit checks;13 integration groups; native C++20/UBSan34/34 и browser/WASI34/34.
- 3 настоящие Docker isolation probes; обе original/edited Qt C++ сборки с разными Wasm hashes и реальными callbacks.
- 12/12 полного Nexus E2E: Qt connection check без лишнего компилятора, GUI/data/tests/submission/review, отдельные аккаунты, storage quota recovery, остановка настоящего бесконечного C++ callback, повторный запуск и обычный консольный проект.
- Все940 случаев M1–5:173+182+223+190+172. Включены ожидаемые отрицательные проверки.
- Encrypted cold Offline, сохранность56 текущих IDs,40 legacy,55 Gold, прежних code/stdin/quiz/VFS/unknown fields и личного проекта/checkpoint. Новых Gold objects/registered IDs0.
- NEXUS-PERF-01 static PASS:75 modules/591219 bytes; outline27476; labs45357. Compiler/Qt не входят в первую загрузку; полевые timings этим не измерены.
- Обычный ZIP проходит CRC, native C++20/UBSan/CTest и CLI без Nexus/Qt; намеренная ошибка обнаружена тестами. SDK image IDs, hashes исходников и артефактов зафиксированы.

Все8 архивов текущего source SHA скачаны через GitHub connector, SHA256 API/архивов и CRC совпали. С учётом промежуточных checkpoints проверено19 архивов. В GitHub нет private stores, TLS keys, browser profiles или Qt binaries. Машинные факты: `CPP_MODULE6_IMPLEMENTATION_EVIDENCE.json`; контрольные суммы: `CPP_MODULE6_IMPLEMENTATION_HASHES.json`. Raw evidence остаётся в `outputs/academy-gold-m6-runtime-20261027`.

## Эксперименты и границы

CI40520128543 на f11e08f прошёл все940 случаев, но GUI Stop в headless shell не прошёл. Смена fixture на стандартный полный Chromium без принудительных site-isolation flags подтверждена последующими успешными прогонами; [документация Playwright](https://playwright.dev/docs/browsers#chromium-new-headless-mode) различает эти режимы. Failed logs сохранены, прежний workflow не выдан за общий PASS. Промежуточный cdcf2be имел незавершённый M4; он также не считается общим PASS.

Готовый Qt6.8.3 SDK с Emscripten3.1.56 использует совместимый JS exception ABI с -fexceptions; WASI сохраняет native Wasm EH. Неудачная попытка другого ABI сохранена. O3 build занимал около157s, прежний O0 около8s; после ограничения output и восстановления SDK entrypoint актуальный безопасный runner измерен локально25.170/24.566s. Это отдельные измерения, без универсального SLA или заявления полной побитовой воспроизводимости SDK.

AUTOMATED PASS относится к синтетическим данным и Chromium. Реальные аккаунты, физические устройства, Safari/Firefox, VoiceOver/TalkBack и production GUI service этим не принимались. GUI Offline, C++/CLI, OS threads и непроверенные Qt modules не объявляются поддержанными. Сервис default OFF; текущий production BFF bundle и исправление входа/выхода сохранены. Условия будущего подключения и хранения: `studio-build/README_RU.md`.

## Следующая работа

03: подготовить12 полных RU/EN Gold-уроков, лабораторные/проекты и их корректные переходы в Nexus Studio. GUI-задания должны открывать Qt target в Project Studio, а не попадать в прежний WASI lesson editor. Затем подготовить комплексный экзамен, практическую работу с незнакомым кодом, самостоятельный проект и защиту с рубрикой. Пилотная проверка TaskFlow не заменяет эту аттестацию.

Перед тестовой публикацией нужны отдельные runner/store/preview ingress, backup/retention, подтверждённый лицензионный маршрут Qt, проверка account-read proof для Studio/logout в01 и приёмка05/07 на устройствах. Публикация требует отдельного разрешения владельца.

Есть ли здесь материал для диплома? Да: архитектура единой среды при переносимости, capability boundary, изоляция, immutable submissions, роль преподавателя, измерения и failed experiments. Эффективность обучения требует отдельного учебного пилота.

🔀 CROSS-BRANCH SYNC REQUIRED

Источник:03. Результат: технический пилот M6, AUTOMATED PASS. Куда по приоритету:02/01/07→05→00/04. Когда: сейчас, до M6-1. Готовый текст: «На2a73791 завершён технический пилот C++ Module6 в feature. CI40542759814:8/8 SUCCESS,12/12 Nexus E2E,40 unit,3 isolation probes, native34+WASI34 и940/940 M1–5. Настоящий Qt C++/Preview, VFS data, Stop/Restart, ZIP и immutable сдача/преподавательская рубрика реализованы. Весь M6 остаётся PARTIAL: Gold контент/экзамен не подготовлены, production GUI service/устройства/лицензирование не принимались. Main/production/релиз не менялись. Следующий этап03:12 RU/EN уроков и правильные связи практики с runtime;02/01/07 согласуют production contracts,05 хранит evidence,04 получает архитектуру/эксперименты». Сообщения автоматически в другие чаты не отправлялись.

WHAT WAS PROVED: технический пилот и перечисленные автоматические проверки. WHAT REMAINS: M6 content/аттестация и deployment/device gates. NEXT RECOMMENDED BRANCH:03 совместно02/07. RECOMMENDED MODE:высокий/Pro для Content, очень высокий для runtime/security.
