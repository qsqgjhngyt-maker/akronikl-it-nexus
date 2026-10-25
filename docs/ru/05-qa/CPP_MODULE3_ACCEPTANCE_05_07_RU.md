# C++ Module 3 приёмка 05 и 07

**STATUS: PARTIAL. 05 — AUTOMATED PASS; 07 — PARTIAL; автоматическая регрессия NEXUS-PERF-01 — PASS.** Два подтверждённых P2 навигации остаются открытыми. Приёмка проведена, полная готовность интерфейса не объявляется.

Проверяемая база: d868bd3e2ef5ad1f42a958af18a74d8a05006a70. Исправление теста и отдельный CI приёмки: 5a1d52f6428e622b42021cedb00a9c209c8226bc. Продуктовые файлы между ними побайтно равны; изменены только tests/platform-startup-browser-check.mjs и новый workflow приёмки. Main 98b884f70c53bac3502b209112d0d3f19e401699 сохранён. Публикаций, production-запросов, Cloud-мутаций и официальных релизов: 0.

## Открытые замечания 07

| ID | Приоритет | Подтверждённое поведение | Условие закрытия |
|---|---|---|---|
| M3-07-001 | P2 | Общий список лабораторных показывает 0 из 18 M3 Gold labs; список legacy меняется с 3 на 2 после посещения Gold-урока | Стабильный каталог Gold лабораторных без eager-загрузки тел на Home, RU/EN online и cold Offline |
| M3-07-002 | P2 | focus=lab открывает functions-contracts, оставляет focus на BODY, задание на 7387px ниже экрана | Scroll/focus к точной лабораторной после ленивой загрузки с сохранением view resume, RU/EN online и cold Offline |

Причина первой ошибки — использование только benchmark.lab, при том что Gold хранит laboratory отдельно. Причина второй — поиск только старых #memoryLab/#oopLab/#cppLab. Сами лабораторные доступны внутри уроков; сохранность и C++ runtime этими замечаниями не опровергнуты. Сценарии, исходники и условия закрытия сохранены в DEFECTS.json и evidence/DISCOVERY_PROBE.json. Новых подтверждённых P0/P1 в покрытом объёме не найдено. Исправление общего каталога — следующий этап 03/07, до закрытия 07 и новой тестовой публикации.

## Доказательства 05

[Полный CI, шесть заданий](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40187113498) выполнен на 39d5a1d. До d868bd3 добавлены только три отчёта; до 5a1d52f — только тест и workflow. Все шесть скачанных ZIP повторно проверены по SHA256 GitHub. Все 75 текущих исполняемых source/file/metadata/case контрактов и 223 случаев сопоставлены с фактическими native и WASM записями, включая отрицательные compile/link контроли, exit1, outputFiles и RU/EN aliases. Это 64 различных main.cpp, не 75 уникальных текстов. Компилятор в новой фазе повторно не запускался: использован подтверждённый CI неизменных исходников.

Native: GCC 13.3, C++20, -fno-exceptions, pedantic-errors и UBSan 223/223. Browser: настоящий router/Worker/Clang-WASI 223/223, пять новых тем Code Studio и проект 3 TU с явным сохранением экспорта и новым импортом. Предыдущие Module 1 CI: 394 native / 173 уникальных WASM-запуска и Module 2 native/WASM: 182, исходные 64, также относятся к этим неизменным файлам.

[Новый CI приёмки](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40189963111) на 5a1d52f — success: учебный DAG, scope, budget, startup 7 и public media 4. Новый CI ZIP скачан и его SHA256 00494e24bd479ae75892cc764c03078b2e80f62ea65d723e5918937254be72d6 проверен локально.

Свежие локальные gates: quality, dependencies, preservation9, unit, regression34 и integration13 PASS. Все 4518 Git blobs совпали с рабочими байтами. Patch main→feature дал tree 1c3677621a40869d704c92fbc59a8d825735e47c, обратное применение в отдельном index восстановило main tree 50736dc3485e13224dc8557fee87dcbf057ba067; настоящий index не менялся.

Две QA сборки совпали по 237 физическим файлам;236 manifest records,223 copied payload совпадают с текущими исходниками. BUILD_MANIFEST SHA256: b838874811de9c47dd048996ef3cc3cb1d81e0504634ff24b7c39b30a92e7ddc. Manifest identity PWA сохранена. Точные 2260 records опубликованного rollback из Git main проверены по hash, без обращения к production. Настоящий SW: точный опубликованный main→QA→точный rollback→QA, две вкладки, localStorage/cache/зашифрованный IndexedDB и проект сохранены, пять групп PASS. Это синтетический upgrade/rollback, не выполненный deploy.

Исторические CRLF предупреждения сохранены; git diff с cr-at-eol проходит. Старые 40 ID/legacyIndex/order/quiz и импорт v7 сохранены, новые 5 имеют legacyIndex=null. Учебная последовательность 18 задана отдельно;40/45 новой программы и прежние 40/40 видны без записи миграции в профиль.

## Содержание и интерфейс

18 Gold тем × RU/EN=36 объектов. На локаль:108 разделов теории,36 разборов,108 задач,18 лабораторных, три различных накопительных практикума, один итоговый каталог/журнал команд,90 вопросов и 108 словарных определений. Итоговый проект:22 случая, отдельный драйвер восьми unit-проверок, рубрика 0–10 с порогом 8 без нуля за корректность/проверки, собственные случаи и мини-защита. Портфолио включает 18 лабораторных и 3 практикума.45 редакционных занятий не выдаются за измеренное время освоения. Полнота структуры и работа программ подтверждены; независимая университетская экспертиза и образовательная эффективность не исследовались.

Новый прогон всех 36 объектов online/cold Offline — девять групп PASS,216 случаев ширины 320/360/390/768/1366/1440. Все 18 синтетических состояний code/stdin/quiz/2-file VFS и завершения сохранены; проект/checkpoint в зашифрованной копии совпали. СловарьRU/EN AX/keyboard/focus, копирование без замены личного кода, входные вопросы и продолжение с новых тем PASS.

Дополнительно 72 состояния(36×светлая/тёмная тема),504 случая семи ширин 320–1440, duplicate IDs0, reduced motion, keyboard models PASS.74 axe-сканирования не дают полного WCAG PASS:74 raw scrollable-region-focusable warning groups сохранены;383 фактических PRE Tab/ArrowRight проверок в Chromium прошли. Incomplete aria-valid-attr-value/color-contrast сохранены. Пять auxiliaryCSS404 от axe importCSS probe воспроизводятся на main и не являются missing assets обычного приложения. Физические Android/iPhone/Safari/AT и настоящий browser zoom не проверены. Четыре целевых screenshot итогового проекта получены; светлый 390 и тёмный 1440 просмотрены.

Свежий Module 1 UI: 12 групп PASS, включая cold Offline, поздние Gold responses и сохранность. Startup после исправления 7/7 на новой программе 45 и 7/7 на main40. Media 4/4: свежая проверка всех фото, revocation/retry, abort и late DOM writes0. Исходный BROWSER_SUITES.json с FAIL startup40 сохранён; corrected и CI результаты лежат отдельно, FAIL не переписан.

## NEXUS-PERF-01

Статический граф 75 модулей/588822bytes при лимите 75/600000, запас 11178bytes. Home: два outline JSON, feature24959bytes против main22135;0 Gold bodies/0 compiler в загрузках документа. Фоновый SW public precache проверен отдельно и не выдаётся за Home document traffic. Пакет компилятора прежний:7 файлов / 105558342 байта(~106MB), по требованию первого Run; реальный CDN/сотовая сеть не измерялись.

20 изолированных контекстов/240 route samples, пять повторов по профилю и варианту в чередующемся порядке. Desktop1440 CPUx1 RTT20ms/10MiB/s; mobile390 CPUx4 RTT150ms/200KiB/s, очередь 6, HTTP cache выключен, warm=SPA/ESM. Ready=новый точный DOM+editorbinding+2rAF; SW в latency-измерителе отключён, настоящий SW покрыт отдельными Offline/rollback опытами.

| Профиль | Маршрут | main median ms | feature median ms | Разница ms | feature p95 ms |
|---|---|---:|---:|---:|---:|
| desktop | cold-home | 989 | 989.5 | 0.5 | 1328.3 |
| desktop | m3-first | 198.1 | 255.1 | 57 | 288 |
| desktop | m3-warm | 57.6 | 67.5 | 9.9 | 69.6 |
| desktop | m3-project-first | 51.8 | 110.9 | 59.1 | 115.7 |
| desktop | m3-project-warm | 64.6 | 65.2 | 0.6 | 71.7 |
| mobile | cold-home | 7018.1 | 7087 | 68.9 | 7107.7 |
| mobile | m3-first | 1101.3 | 1404.2 | 302.9 | 1466.7 |
| mobile | m3-warm | 235 | 269.7 | 34.7 | 279.1 |
| mobile | m3-project-first | 240.7 | 757.9 | 517.2 | 765.5 |
| mobile | m3-project-warm | 229 | 330 | 101 | 344.8 |

При пяти повторах p95 равен максимуму, устойчивый field percentile не заявлен. Mobile Home+68.9ms(~1%), первый M3+302.9ms; полный проект+517.2ms к прежнему короткому материалу. Это измеренная цена дополнительного JSON/DOM, не ускорение. Абсолютный route budget не утверждён. Mobile Home~7s и long tasks до 838ms(feature)/852ms(main) — лабораторные наблюдения; field Core Web Vitals PASS не объявляется. Измеренный layoutShiftSum0 также не равен field CLS PASS. Строка M1 после разных M3 предзагрузок не доказывает ускорение холодногоM1.

Lifecycle:100 project/Home циклов на main и feature,20s idle и GC. Main nodes577→577/listeners134→134, heap после 20/100idle4.68/4.82MiB. Feature578→578/135→135, heap4.90/5.11MiB. Solar201created/200disconnected, detached0 в обоих случаях. Boolean/disposed JSHandle в измерителе не удерживает старые DOM. Это ограниченный контроль, не доказательство отсутствия любых утечек и не field heap budget.

## Исправление измерителя и ограничения

Новый runtime/Identity/Cloud/прогресс не менялся. В feature исправлен только startup-test: ожидаемые lessonCount/projectCount теперь читаются из manifest именно проверяемой сборки; независимый M3 DAG gate продолжает требовать ровно 45 тем. Добавлен read-only CI приёмки без deployment. Локальная ошибка старого runner integration-base исправлена в методике, её первоначальный FAIL сохранён. Подробности — FAILED_EXPERIMENTS_RU.txt.

Личные данные владельца не читались. Его приёмка Module2 остаётся историческим фактом, не заменяет будущую физическую приёмку Module3. LIVE/FULL LIVE PASS не заявляются.

Есть ли здесь материал для диплома? Да: сохранение 40/40 при расширении до 45 тем, один source/file контракт на двух компиляторах, изолированная runtime FS с явным сохранением в VFS, controlled startup/lifecycle и обнаружение расхождения каталога с ленивыми Gold данными. Альтернатива eager-загрузки всех Gold на Home нарушает принятый lazy contract; для исправления каталога нужна компактная стабильная метаинформация. Образовательные результаты на учащихся не выдумываются.

WHAT WAS PROVED: 05 AUTOMATED PASS; фактические Gold UI/Offline/C++ и сохранность; автоматические guards NEXUS-PERF-01 PASS.
WHAT REMAINS:закрыть M3-07-001/002 и повторить 07, затем отдельное решение владельца о тестовой публикации; физическая/AT/field/педагогическая приёмка остаётся отдельной.
ROUTING CHECK:00→03/07→05→04; тексты подготовлены, в другие чаты не отправлены; источники sources/ read-only не менялись.
NEXT RECOMMENDED BRANCH:03/07, исправление двух P2 в той же feature.
RECOMMENDED MODE:Высокий.
