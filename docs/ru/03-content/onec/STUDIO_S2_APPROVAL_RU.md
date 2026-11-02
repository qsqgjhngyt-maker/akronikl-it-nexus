# 1С Studio S2 — пакет для согласования настоящего исполнения

Дата проверки источников: **31.10.2026**. STATUS: **PLANNED / APPROVAL PENDING**. Это проект решения 00/02/01/03/05, не утверждённый runtime contract и не разрешение установки/лицензирования от имени пользователя. S1 поддерживает редактирование/сохранение/копии/экспорт. Native runner, listener, installer, OS settings или новый провайдер этим документом не включаются.

## Предмет решения

Согласовать **S2-0**: проверить право использования точного официального дистрибутива, возможность изолированной среды и воспроизводимость нативных 46 A2/P2 cases. После этих gates отдельно допустить **S2-A**: запуск ученической рабочей копии внутри одноразовой среды с ограниченным возвратом результатов. Автоматическое «Запустить» из Studio через локальный bridge — **S2-B**, отдельное согласование после S2-A. Всё в том же PR #63/одном потоке, без main/production/merge/Release/платных услуг.

| Этап | Конкретный результат | Условия входа / статус |
| --- | --- | --- |
| S2-0 | Версия+SHA дистрибутива, условия лицензии, isolation profile, native positive/negative evidence на чистой копии | Одобрение 00/02/01; сейчас PLANNED |
| S2-A | Замороженный snapshot S1 → новая гостевая база → настоящий 1С check/run → ограниченный локальный result receipt, исходник и progress не переписываются | Права/изоляция S2-0 PASS; согласованный snapshot/result adapter; сейчас PLANNED |
| S2-B | Кнопка Studio и локальный broker с ограниченной capability, отменой/таймаутом и проверкой origin | Отдельный threat model/contract 02+01 и приёмка05/07; сейчас НЕ СОГЛАСОВАН |

Это поэтапный вариант одной интеграции. A3/P3 и второй implementation candidate здесь не создаются.

## Официальная платформа и права

Целевой кандидат для feasibility — **учебная 1С 8.3.27.1508 Windows**, совместимость конфигурации 8.3.27; предыдущая доказанная A2/P2 reference — установленная официальная **8.3.27.2214**. Смена build требует нового прогона, совпадение семейства не является доказательством. Официальный каталог содержит также 8.5; автоматический переход на неё не предлагается. [Каталог учебных версий](https://online.1c.ru/catalog/free/learning.php).

Страница 8.3.27.1508 предлагает бесплатное получение после анкеты и принятия лицензии. Она описывает учебные ограничения: один сеанс, без client-server и реального производственного учёта. Это подходящий кандидат для небольшого синтетического стенда, не доказательство прав на hosted multi-user сервис. [Официальная карточка версии и ограничения](https://online.1c.ru/catalog/free/28765768/).

Полный [EULA по ссылке из карточки](https://online.1c.ru/admin/documents/agreement.php?ID=16463663) этим исследованием не прочитан: доступ через инструмент не получен. **VM, автоматизированный запуск, тиражирование/установка и способ получения дистрибутива требуют проверки полного применимого соглашения.** Анкета не отправлялась, принятие соглашения за владельца не выполнялось. Дистрибутив, установщик, ключи, активация и чужие конфигурации в Git/artefacts не входят. Наличие прежней платформы на рабочем ПК не подтверждает право копировать её в гостевую ОС. Community/EDT/OneScript не подменяют эти права и контекст исполнения.

BSL LS доказывает статический анализ, не запуск. OneScript можно оценить отдельно для совместимого подмножества .os после paired tests, но A2 metadata/формы/объекты 1С этим не выполняются. Ни подсветка, ни JS-модель курса не получают статус native PASS.

## Изоляция: предлагаемая граница

Произвольный BSL рассматривается как недоверенный код с возможными действиями вне учебной базы. Хостовая временная папка, отдельная база или SafeMode сами по себе не доказывают изоляцию всей конфигурации. Стандарт 1С рекомендует ограничивать произвольные `Выполнить/Вычислить` и дополнительно ограничивать доступные функции; это не разрешение исполнять любой ученический модуль на хосте. [Стандарт 1С 770](https://its.1c.ru/db/content/v8std/src/600/i8100770.htm).

Предпочтение S2-0: disposable VM с чистым snapshot и официально разрешённой платформой внутри, без учётных данных/браузерного профиля/реальных данных. Только read-only input конкретного run, гостевой временный диск, сеть/clipboard/микрофон/камера/принтеры/shared host writes выключены. Выход — отдельный ограниченный канал чтения структурированного результата после завершения процесса, не общий writable host mapping. Конструкция канала и защита от symlink/reparse/hardlink/размера файла подлежат отдельной проверке; она пока не реализована.

Windows Sandbox — запасной кандидат feasibility. Его defaults включают сеть, clipboard и audio; writable mapped folders сохраняют изменения на хосте. Поэтому default запуск или writable output mapping не принимаются как готовая безопасная среда. [Официальные настройки и предупреждения Microsoft](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file).

Доступность VM/Windows Sandbox, лицензия гостевой ОС, SKU, ресурсы и аппаратная виртуализация здесь **не доказаны**: read-only CIM-проверка в доступном контексте не получила сведений. ОС/защита не менялись. Нельзя обещать одинаковый запуск на каждом компьютере или из мобильного браузера. Телефон сохраняет/экспортирует работу; доступный native execution target и его ограничения показываются явно.

Предварительные пределы для измерения, **не подтверждённые значения**: один job, 2 CPU, 4 GiB guest RAM, 2 GiB writable guest disk, до 120 s check/run и до 10 min setup, stdout+stderr ≤1 MiB, result ≤256 KiB, input по S1 ≤1 MiB/64 файла. VM supervisor обязан реально ограничить/измерить их; если конкретный механизм не умеет CPU/disk cap — feasibility gate FAIL, а не декларация ограничения. Значения корректируются по чистым синтетическим прогонам, до допуска ученического кода.

## Снимок работы, проверка и результат

1. Пользователь явно сохраняет/замораживает snapshot. При конфликте S1 сначала экспортирует/создаёт новую копию; запуск не делает принудительный save. Источник получает неизменяемую привязку: course/topic/content/configuration revision, project ID, local/workspace revision, отсортированные path+SHA256 файлов, template/test-set hashes, platform build и новый run ID.
2. Guest получает только исходники snapshot и разрешённый harness. Каждый run создаёт **новую** гостевую базу в собственном каталоге; пользовательские/старые пути баз и произвольные argv не принимаются. Нет restore/update поверх существующей работы. Cleanup касается только проверенного собственного run; source/backup/progress никогда не удаляются. Данные стенда синтетические.
3. Проверка конфигурации + настоящее выполнение 1С. Exit code 0 без ожидаемых case IDs/семантических утверждений — не PASS. Syntax error, failed assertion, environment/license unavailable, timeout, cancelled и incomplete/malformed result различаются. Для A2 нужны metadata/document validation и формы; для P2 алгоритмы/границы. Positive/negative pack привязан к версии, 46 прежних cases повторяются на целевой платформе.
4. Receipt содержит run ID, snapshot hashes/revisions, platform build, test-set hash/case IDs/outcomes, ограниченный output, время, outcome и `trust=local-untrusted`. При несовпадении любого snapshot/test-set/platform параметра — результат другого запуска, не зачёт текущей работы. Отмена/повтор создают новый run ID и сохраняют предыдущий результат.
5. Результат не перезаписывает source, course attempts/provenance или старый прогресс. Отдельная запись local run history/ограничение её размера потребуют contract согласования; существующий Account/academy progress adapter не меняется. `codeVerifiedServer=false`, `credentialEligible=false`, automaticCompletion=false. Локальный отчёт можно изменить; его подпись broker не доказывает авторство или доверенное оценивание.

Текущий учебный `ManagedApplicationModule.bsl` содержит и решения, и проверяющий harness, доступный ученику для редактирования. Его прежний native PASS полезен для correctness стенда, но не для защищённой оценки. Перед автоматическими learner runs нужен новый версионированный kit с отдельным зафиксированным harness и отдельным модулем решения в **новой копии**. Не переписывать/переименовывать прежние работы, Topic ID или configuration 0.2.0. Regex-переписывание ученического полного исходника и `Выполнить` строки вместо согласованного интерфейса не предлагаются.

## S2-B: условия для будущего bridge

Сейчас listener отсутствует. Предлагается отдельный минимальный broker, который принимает только bounded source job, а не shell command, host path, порт/URL базы, installer или account secret. Нужны fixed executable+argv allowlist, без shell; строгие origin/Host allowlists, без wildcard CORS; POST и одноразовый короткий job nonce/capability с привязкой к origin/snapshot. GET не запускает job, DNS rebinding/чужой сайт/повтор/параллельный запрос проверяются. Loopback сам по себе не авторизация. Capability не использует session secret/Nexus tokens и не попадает в логи, URL, экспорт, Git или evidence.

02/01 отдельно определяют выдачу capability, pairing/cancel, result transport, quotas, update/installer trust и cleanup. Пока этого решения нет, нельзя добавлять native runtime provider в общий registry, отключать browser protection, менять CSP/IAM/OAuth или просить пользователя запускать непроверенные команды.

## Матрица допуска и согласование

| Gate / ответственная ветка | Минимальное доказательство | Сейчас |
| --- | --- | --- |
| G0 Rights /00+01 | Полный применимый EULA, точная версия/источник/SHA, разрешённая установка/VM/unattended модель без платных услуг | PENDING |
| G1 Isolation /01+02 | Чистая guest среда, отсутствие сети/host write/secrets, реальные resource/timeout/cancel/output limits; безопасный readback | PENDING |
| G2 Native /02+03 | 46 known-positive cases и syntax/semantic negatives на target build, metadata/forms, независимые hash/log evidence | Исторический reference PASS; target guest PENDING |
| G3 Preservation /02+05 | S1-R06 общий writer gate; источник/backup/IDs/progress/attempts/provenance неизменны при success/fail/quota/crash/retry | Scoped S1 AUTOMATED PASS; общий gate PENDING |
| G4 Contract /02+01+03 | Согласованный snapshot/result adapter, harness split, honest trust flags; bridge отдельно | PENDING |
| G5 Acceptance /05+07 | Real-session desktop smoke, mobile no-runtime UX, offline/unavailable/errors, no false PASS, reproducible artifacts | Browser fixtures PASS; LIVE PENDING |

**Текст решения для 00/02/01:** «Согласовать S2-0 в одном потоке PR #63: проверку прав конкретной официальной учебной версии, проект/проверку disposable isolation и native feasibility на новой синтетической базе. До G0/G1 PASS ученический код на хосте не исполнять. S2-A допускается отдельным решением после evidence S2-0 и согласования snapshot/result interface. S2-B/локальный bridge/общий runtime provider/Account progress adapter требуют отдельного contract approval. Main, production, merge, Release, платные услуги и чужие данные не затрагивать. Отдельно назначить решение S1-R06 для общего store без потери старых работ».

Это **подготовленный текст**, не утверждение, что согласование уже получено. Следующий operational step после решения — один воспроизводимый S2-0 feasibility experiment → evidence → review. Нельзя выдавать PLANNED VM/лицензию/защищённое оценивание за IMPLEMENTED.
