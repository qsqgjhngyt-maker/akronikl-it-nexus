# S6 — личный запуск работ ученика в официальной учебной 1С

31.10.2026. Один поток PR #63, продолжение S5 `cb8cf3c5c522bfc8d98c43ff9142494ac965754c`.

STATUS: AUTOMATED PASS технического сценария S6 / PARTIAL общей готовности к публикации. Это кандидат, не опубликованный выпуск. Main, production, merge, deployment и официальный Release не выполняются. Финальная привязка к GitHub HEAD/CI хранится в описании PR и отдельной квитанции после коммита, чтобы не создавать самоссылку SHA.

## Что доказано

Работа из настоящего интерфейса Studio экспортирована как зарегистрированный запрос. Новый Windows Sandbox установил официальную учебную 1С 8.3.27.1508 из отдельно полученной владельцем поставки, проверил и исполнил изменённый исходник. Ограниченный протокол вернулся через официальный Windows CLI, был импортирован в тот же Studio. Исходная работа и оба учебных прогресса до/после импорта побайтово совпали. После следующего редактирования прежний результат сохранился как исторический. Аккаунт браузерного опыта синтетический: реальные server Account writes этим опытом не доказаны.

Запрос `af3a2a4e-cadb-47b9-9021-527dacef2d34`, запуск `a62e8a3d-9923-48fe-ba97-2da9b42cd56b`, snapshot SHA256 `18c0313854d7473205bac8706c952d1642b4d1786b84bb63029d85f88d02fbbb`. Binary SHA256 `2a6bc2955d09cba909b9b6f1b157ba16a03c0b117f85fe0745798ddd23880534` связан с source/lock/spec в LEARNER_BUILD_RESULT. Полный цикл 553237 мс: подготовка платформы guest exit30, learner exit0, diagnostic0, штатный stop и подтверждение отсутствия своего UUID. Свежий цикл также закрывает непройденный в S5 replay установки VC/MSI с окончательными бюджетами600с на компонент.

Отдельно на настоящей учебной платформе семь собственных случаев: compile-only; изменённый рабочий код; синтаксический отказ; отказ локальной семантической самопроверки; невозможность записи в readonly исходник; CPU quota; wall timeout ожидающего дочернего процесса. Контролируемые QA-случаи использовали прежний собственный стенд, а не свежую VM на каждый из семи случаев. Полный пользовательский E2E использовал новую VM и завершил её. Отдельный native Job Object probe подтвердил ограничение памяти, timeout и уничтожение обычного дочернего процесса. На host нормальные режимы learner/selftest отказали с35/55 без исполнения платформы. Сохранены12 исходных эталонных файлов и84 файла семи снимков.

## Учебный комплект и совместимость

Канонический curriculum не расширяется этим этапом: `onec` P1–P12/52 темы и `1c-enterprise` A1–A8/32 темы, всего84/168 RU/EN. По каждому курсу три варианта итогового теста по24 вопроса, четыре практики и три проекта на выбор. Сравнение #62/#63,95→84 компетенций,80 старых Topic ID, attempts и provenance сохраняются. Третьего Course ID нет. C++67 не изменены. PR #62 не закрывался этим этапом.

Полная локальная регрессия:41 группа,268 unit tests. Chromium:49 browser checks; WebKit26.5 Windows:49 проверок, собранных из course21 + Studio22 + assistant6. Все168 локализаций на desktop и трёх мобильных размерах; итоговые варианты; холодный offline; сохранение/копии/экспорт/reload; несовпадающие ревизии, повторный/подменённый протокол, quota/corrupt history; общий C++ writer и исключение чужой записи. Это эмуляция устройств. NEXUS-PERF-01:80 static modules/634989bytes при caps80/640000; полевой p95 не измерен.

Изменились ровно три уже закреплённых файла: course-specific Studio и два browser tests. Их прежние/новые SHA перечислены в EXACT_SCOPE_DELTA. Остальные34 позиции сохранены. Новый trusted scope привязывается отдельным ancestor commit; workflow pin обновляется отдельным коммитом. Исторические P4-Q security/release gates и защищённые backend/IAM/catalog/runtime provider contracts не ослабляются. Content-review означает отсутствие запроса исторической публикации, а не допуск Release.

## Граница доверия

Это личный Windows x64 учебный комплект, не общий публичный сервер. Официальные media/платформа/ключи/базы/дампы не включаются в Git или Nexus-архив. Владелец получает поставку самостоятельно; право общего сервера из личного соглашения не выводится. Платформа на host не устанавливается. Подпись vendor и SHA проверяются в guest, MSIX publisher/status/block map — на host; онлайн-проверка отзыва сертификатов при отключённой сети не заявляется.

Одна readonly папка; сеть/vGPU/clipboard/audio/video/printer выключены,4GiB VM. Процесс назначается Job Object до первой инструкции,512MiB/process,1GiB/job,4 обычных процесса,CPU50%,35с user CPU,45с на вызов/90с на learner workflow. Внешний watchdog110с и finally останавливают только собственный VM UUID. Job Object не гарантирует охват брокерных процессов гостевого администратора. При аварии самого host controller finally не гарантирован: сохраняется host-журнал UUID/стадии, но независимый orphan recovery для общего сервера не реализован.

Из guest возвращается только числовой статус и bounded file/line/column/kind, без произвольных файлов/HTML/raw logs. В Studio импортируется локальный недоверенный протокол: `outputTrusted=false`, `codeVerifiedServer=false`, `credentialEligible=false`, `automaticGrade=false`, `progressWritten=false`. Exit0 не доказывает правильность решения или авторство. Серверная аттестация не добавлена. База/новые гостевые файлы исчезают после stop; постоянные исходники и снимки остаются в Studio/личном каталоге. Private журнал использует существующий account namespace и штатную очистку; schema проекта, IAM/OAuth/BFF/Worker/D1 не меняются.

## Отказы и исправления

Первый fresh lifecycle завис после создания VM, до установки. Подтверждён собственный nonce, остаточная VM штатно остановлена; собственный зависший Node controller завершён после проверки PID/родителя/пути. Причина packaged-console handles — гипотеза, не доказанный внутренний механизм Windows. Исправлен фиксированный PowerShell wrapper с аргументами как данными и приёмом exit+полного JSON, без ожидания унаследованных GUI pipes. Исправление прошло unit negative cases, реальный start/stop и новый полный E2E.

Первый CPU case ошибочно ожидал wall timeout: штатный CPU quota остановил его раньше и старый mapper назвал это обычной runtime ошибкой. Добавлена точная классификация quota, CPU и wall проверены разными случаями. Windows WebKit блокирует даже пустой file HTML при browser-offline; контрольный опыт сохранён. Для этого движка весь HTTP(S) запрещён с обязательным отрицательным сетевым контролем; сервер выключен и учебных HTTP requests0. Chromium остаётся browser-offline. Ожидания нового DOM, освобождения закрытой вкладкой lock и получения editor lease исправлены в тестах; запреты writer не обходятся. Restricted loopback EACCES отделён от продукта; тот же полный набор с разрешённым локальным соединением прошёл.

## Что ещё до публикации

1. Exact-head CI и независимый review02/01/05/07; локальные native доказательства не выдаются за Windows execution в GitHub Ubuntu CI.
2. Реальные candidate Account writes через допустимый preview origin, естественный голос и физические desktop/Android/iPhone проверки. Синтетическое распознавание/аккаунт не заменяют их. Отдельный облачный ASR provider не выбран и не подключён; платные услуги не используются.
3. Forms/СКД/roles/RLS/server concurrency/scheduling/EDT не получают native PASS от текущих73 reference checks/семи learner cases. Нужны соответствующие lawful environment и acceptance matrix, либо явное ограничение заявляемого выпуска. Независимая педагогическая эффективность не измерена.
4. Общий публичный каталог ещё PLANNED. Подготовить и проверить конкретный activation/release candidate, rollback и release notes; после приёмки получить одно итоговое разрешение владельца на изменение main/production/merge/официальный Release. Наличие84 authored тем не означает завершённую публикацию.

## 🔀 CROSS-BRANCH SYNC REQUIRED

Источник:03 CONTENT PRODUCTION /05 RELEASE EVIDENCE.

Результат/milestone:S6 personal official learner runtime и возврат локального протокола в Studio — AUTOMATED PASS, общая публикация PARTIAL.

Куда:02/01 →05/07 →00/04.

Почему:review границы исполнения/account journal; независимая приёмка и release evidence; MASTER и диплом.

Когда:сейчас зафиксировать архитектуру; после exact-head CI передать единую квитанцию.

Что передать:этот отчёт, ADR, exact scope delta, source/build SHA, E2E/cases/browser/regression evidence, оставшиеся риски и отсутствие публикации.

Готовый текст для вставки: «PR63 остаётся единственным implementation candidate. S6:из Studio экспортирован изменённый исходник, в свежем Windows Sandbox установлена официальная учебная1С8.3.27.1508, код исполнен, VM штатно остановлена, bounded локальный протокол возвращён в Studio без изменения исходника/обоих прогрессов. Полный цикл553237мс; семь native cases и Job Object probe;41regression/268unit; Chromium и WebKit по49browser checks. Локальные протоколы не являются server verification/зачётом. Два курса84/168RUEN, старые IDs/attempts/provenance и C++ сохранены.02/01:review VM/account/trust boundary;05/07:реальный Account/голос/устройства и native advanced matrix;00/04:зафиксировать PARTIAL publication readiness и архитектуру. Exact HEAD/CI — в квитанции PR. Main/production/merge/Release не выполнялись, публичный каталог PLANNED. Следом единый activation/release candidate и итоговое разрешение владельца».

Что потом:вернуться в тот же поток PR63; не начинать конкурирующий PR или независимую ветку курса.

Есть ли здесь материал для диплома? Да:см. ADR — числовой канал вместо host output, readonly/source preservation, local report trust, MSIX chain, Job Object и VM boundary, failed experiments, измеренные latency и ограничения. Педагогический эффект и fieldp95 не выдумываются.

NEXT RECOMMENDED BRANCH:03/05 с review02/01/07. RECOMMENDED MODE:очень высокий для security/release, высокий для content.
