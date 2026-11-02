# 03/05 — фактический Windows Sandbox и исправление startup

STATUS:PARTIAL. Продолжение единственного PR63 от HEAD40969d3e1a9c17ed4417d62249fb3818b44b6497. Точный новый SHA/CI фиксируются в PR и квитанции после отправки. Никакого допуска к публикации этим отчётом не выдаётся.

## WHAT WAS PROVED

Владелец выполнил штатное включение Containers-DisposableClientVM с NoRestart, получил RestartNeeded=True и перезагрузил Windows. LastBootUpTime31.10.2026 15:26:16+07 подтверждён чтением ОС. WindowsSandbox.exe и WindowsSandboxClient.exe появились; обе подписи Microsoft Valid. Это подтверждает наличие компонентов, но не полную платформенную приёмку1С.

Реальный отдельный desktop Windows Sandbox открылся. В нём видны NexusInput,source,job.json и операторские файлы. Проверка создания папки получила «Нет доступа к целевой папке»: LIVE PASS read-only input. Сохранён screenshot. На host заново совпали все12 исходных SHA и sourceSnapshot af19d9dab9679256247d30ec587fdb392e6ee62010489c5ec488deee155ae17b. Работы/прогресс/попытки не записывались.

Проверка обнаружения исправлена: отсутствие команды в PATH не равно отсутствию Sandbox. Добавлено системное расположение; реальный процесс с пустым PATH нашёл WindowsSandbox.exe через SystemDirectory. Это PREFLIGHT_ONLY, не LIVE. Состояние optional feature без admin по-прежнему UNKNOWN, а не Disabled. При проверке поиска отдельно использовался заведомо отсутствующий PlatformPath: NOT_FOUND в таком probe не означает исчезновение настоящей host-платформы.

## Доказанный отказ startup

Ожидаемая стартовая страница не появилась. Диагностический LogonCommand с теми же read-only/network/privacy ограничениями поймал System.Management.Automation.PSSecurityException: запуск .ps1 в стандартном guest запрещён. Ученический BSL не запрашивался. Скриншот PS_STARTUP_REFUSED сохранён. ExecutionPolicy, GPO, antivirus, Windows security/privacy не менялись.

Новый собственный NexusLabBootstrap.cs собирается установленным .NET Framework compiler, без загрузки compiler/runtime. Сборка в новый каталог и SHA source/binary сохранены. На обычном host проверенный exe вернул exit23/GUEST_IDENTITY_REQUIRED до workspace access. В Git находится исходник, не exe/образ/платформа. BUILD_RESULT — локальная квитанция, не удалённая аттестация.

Native-модуль предназначен только для проверки и копии:guest identity и Microsoft VM,фактический отказ записи в input,ограниченный manifest/paths/reparse/size,индивидуальные и общий SHA. Проверенные bytes остаются в памяти до создания отдельной UUID-копии с повторными hashes. Он не запускает1С/BSL, не подтверждает лицензию, не пишет progress и не выдаёт credential. Проверка обычного host не заменяет guest LIVE.

Упаковщик принимает executable только отдельным операторским аргументом и проверяет источник/binary SHA. Поле bootstrapExecutable из пользовательского export JSON игнорируется CLI; EXE ученика в source не разрешён. Без операторской сборки открывается WELCOME.html/BOOTSTRAP_REQUIRED, не обещание выполненной проверки. Исторический PS runner остаётся в source, но не запускается автоматически в stock guest.

## Повторный сеанс и неудачный lifecycle

Второй одновременный экземпляр Sandbox был штатно отклонён. При подготовке повторного запуска агент завершил только связанные с собственными launcher процессы клиента/сервера. Это был неудачный способ lifecycle: после него возникли ошибки лимита удалённых сеансов и выхода из удалённой среды. Причинный механизм не доказан, корреляция и попытки сохранены. Проверка отсутствия клиента и сервера сама по себе не устранила ошибку; vmmem нельзя считать надёжным признаком активного гостевого сеанса. Системные службы не перезапускались, другие VM/контейнеры не останавливались. Принудительное завершение процессов не принимается как штатный lifecycle готового runtime.

Следствие: native verifier/copy внутри guest не приняты. Не повторять бессистемно запуск новых сеансов; восстановить чистую гостевую сессию штатным закрытием/перезапуском. Если Windows сохраняет session-limit, требуется управляемый перезапуск владельцем. Host source hashes сохранены. Никакие реальные ученические работы в этих тестовых guest не создавались.

## AUTOMATED PASS

41 regression group/254unit: прежние контракты,C++,Studio,сохранность,CP,offline/policy/performance. Добавлены две проверки: export JSON не может выбрать executable; изменённый binary отклонён до создания output. Native host-refusal реальный, но guest acceptance не объявляется. Прежние46browser проверок не выдаются за новый локальный прогон; полный GitHub CI точного candidate проверяется после отправки. NEXUS-PERF-01 прежний:80 startup modules/634989bytes,caps80/640000;fieldp95 не измерен.

Новый build tool сначала не прошёл строгий preservation allowlist. Проверка не ослаблена: tool перенесён в существующее пространство check-onec-*.ps1; повторные41группа PASS. Protected scope/router/release admission/receipts/security gates байтово сохранены.37exact pins не расширялись. Изменены только course-specific runtime/checks и docs, разрешённые существующим content-review.

## WHAT REMAINS

Принятый lifecycle Windows guest и реальная native проверка/две независимые копии; отдельная законная установка1С внутри guest; настоящий запуск learner snapshot и возврат ограниченного результата; оставшаяся платформенная матрица,physical voice/Account/mobile/WebKit/security/pedagogy. Этот этап не устанавливал1С в guest и не переносил ключи host. Подписанный executable host не является правом guest; учебная/иная поставка выбирается по её точным условиям. Источники по лицензиям и ограничениям сохранены в предыдущем S3 report.

Курсы84темы/168RUEN,TopicID,прогресс,attempts/provenance,консолидация#62→#63 и C++67 не менялись. Main/production/Identity/IAM/OAuth/BFF/Worker/D1/runtime router не менялись,merge/deploy/Release не выполнялись. codeVerifiedServer=false/credentialEligible=false.

## 🔀 CROSS-BRANCH SYNC REQUIRED

Источник:03/05. Результат:Windows guest desktop/read-only LIVE и stock-PS refusal;native verifier IMPLEMENTED с host refusal,guest LIVE pending. Куда:02/01→05/07→00/04. Почему:операторский startup/lifecycle/изоляция и evidence. Когда:после CI этого candidate,до следующего крупного этапа.

Готовый текст для вставки:

«MASTER00,единый PR63,31.10.2026. STATUS:PARTIAL. После включения Windows владельцем доказаны отдельный Sandbox desktop,видимость input и реальный отказ записи;12source SHA сохранены. Обнаружен PSSecurityException stock guest, политика не ослаблялась. IMPLEMENTED собственный .NET verifier-only source/builder/packager;реальный host refusal PASS.254unit/41regression PASS,точный новый SHA/CI см.PR. Native guest/copy NOT ACCEPTED из-за session-limit после неудачного принудительного lifecycle; требуется чистый штатный сеанс. Официальная1С в guest ещё не установлена,BSLне запускался,права/ключи не переносились.02:принять verifier-only/lifecycle и отдельныйoperatorbinary,не считать public runtime готовым;01:review trust/path/reparse/build record и OS isolation;05/07:оставшаяся LIVE/device matrix;04:ADR/failed experiments,границы доказанного,без claims педагогической эффективности. Main/production/merge/Release не менялись. Следующий приоритет—чистый guest,реальная проверка копий и законная платформа;только один рабочий поток.»

Есть ли здесь материал для диплома? Да:почему stock script startup не прошёл,альтернативы(policy bypass отвергнут;отдельный native verifier выбран),архитектура до/после,trust boundary и отсутствие remote attestation,реальная write-denial/source integrity,ошибка lifecycle,измеренные тесты и ограничения. Дальнейшая приёмка не выдумана.

NEXT RECOMMENDED BRANCH:02+03/05 в одном потоке. RECOMMENDED MODE:Очень высокий для runtime/security/лицензий.
