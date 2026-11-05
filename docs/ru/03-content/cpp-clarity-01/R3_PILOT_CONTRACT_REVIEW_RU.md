> Актуализация 05.11.2026: редакция 2 на 2715275478d121b9305014e0f87b7ba32fa22253 принята 01 и 02 — APPROVE / CONTRACT ONLY; все девять замечаний закрыты на уровне контракта. Интеграция реализована, см. [R3_IMPLEMENTATION_RU.md](R3_IMPLEMENTATION_RU.md). Ниже сохранена история подготовки. По последнему поручению владельца промежуточная рассылка прекращена; итог сдаётся 00.

# R3 — контракт сохранения, редакция 2 для повторного review 01/02

STATUS: CONTRACT REVISION 2 / PROFILE RE-REVIEW PENDING. Решения01/02 на9fa8c2c — CHANGES REQUESTED, не APPROVE. Места хранения и пределы приняты; замечания R3-01-01…04 и R3-02-01…05 отражены ниже. Новый writer и интегрированный renderer НЕ подключены. Исполнена независимая часть: core/cpp-clarity-r3-state.mjs — чистые валидация/сериализация/проверка ревизии/снимка, без Storage, DOM, сети и импорта из продукта.

Один исполнитель, прежние ветка и Draft PR65. Принятые03/07 18 ресурсов этапа A на8bccaf5308b18c6211bb402f6f72943f18d9fac4 не меняются. Исправление fingerprint не меняет contentRevision. Ниже будущие операции помечены PROPOSED, а не выданы за работающую интеграцию.

## 1. Область и границы доступа

Одна запись clarityDraft на canonical topic в выбранном контексте:
- cpp.programming-process: courses.cpp.lessons[id].clarityDraft в существующем account state:v1;
- onec.p2.topic-1 и onec.p7.topic-2: lessons[id].clarityDraft в существующем onec-candidate:v1:onec через createOnecAccountStorage;
- C++ local copy: payload.state.courses.cpp.lessons[id].clarityDraft через конкретную разблокированную vault session.

RU/EN, повторная запись и новая редакция материала не создают другие ключи/записи. Это не предел числа проектов или vault-копий. 1c-enterprise, прежние attempts/completionHistory/completed/projects не изменяются новым draft. У 1С не появляется offline-adapter и её ответы не попадают в C++ vault. Anonymous/public mode — чтение, без приватной записи.

Account storage разделяет аккаунты, но online localStorage не шифрует. Vault session даёт доступ к отдельной шифрованной копии, но не серверную авторизацию. Нет новых keys/endpoints/IAM/cookies/server sync; глобальный allowlist account-storage не расширяется.

## 2. Закрытая схема v1 — IMPLEMENTED как чистый валидатор

Исполняемое определение: core/cpp-clarity-r3-state.mjs. JSON-схема конечная на каждом уровне. Неизвестные поля/версии внутри clarityDraft отвергаются; старые поля lesson/course сохраняются. Вход writer берётся только из JSON/проверенного захвата; getter/prototype не является формой сохраняемой записи.

Все перечисленные поля обязательны; отсутствие работы/результата обозначено null, answers может быть пустым объектом.

| Поле | Точная форма |
| --- | --- |
| schemaVersion / topicId | 1 / один из трёх разрешённых ID, совпадает с местом записи |
| contentRevision | Строка 1…80 символов [A-Za-z0-9._-], первый символ буквенно-цифровой. Текущая общая RU/EN редакция r3-stage-a-8bccaf5 |
| stateRevision | Безопасное целое >=1 в сохранённой записи. 0 только у ещё не сохранённого буфера. Следующая запись = expectedStateRevision+1; MAX_SAFE_INTEGER не переполняется |
| stage | explanation / selfcheck / practice |
| positions | Ровно три ключа этапов; каждый {x,y}, конечные числа 0…10000000 CSS px |
| activeFile | null либо безопасный относительный POSIX-путь до1024 UTF-8 байт; без пустых сегментов, . / .., обратных слешей, двоеточия, управляющих символов и одиночных UTF-16 surrogate |
| cursor | null либо {start,end,direction,scrollTop,scrollLeft}; start/end — безопасные целые UTF-16 offsets, 0<=start<=end<=длины доступного файла; direction=forward/backward/none; scroll — конечные 0…10000000 |
| answers | Объект только с вопросами выбранной темы; значение {value,checked,contentRevision}. Для двух choice-вопросов value — целое0…2, checked — boolean. Для free value — строка, checked всегда false |
| workBinding | null либо один из вариантов ниже. activeFile/cursor при null binding тоже null |
| reportDraft | Строка до16384 UTF-8 байт, отдельная от lastResult.output |
| lastResult | null либо точная форма результата ниже |

Вопросы: C++ cpp-predict/cpp-error/cpp-explain; BSL bsl-predict/bsl-save/bsl-explain; JOIN join-inner/join-name/join-explain. Последний в каждой тройке free; он не получает автоматическую оценку. Изменение ответа через editClarityAnswer сбрасывает checked. Положительный checked используется только при совпадении contentRevision; при другой редакции прежний текст не удаляется. Неизвестные прежние question ID не отбрасываются молча: исходная запись сохраняется, изменение отклоняется до явной миграции.

workBinding:
- {kind:'lesson',topicId:'cpp.programming-process',workspaceDigest:sha256} — существующая C++ lesson-workspace;
- {kind:'local-project',id,workspaceDigest:sha256} — уже существующий exercise-project именно разблокированной копии C++;
- {kind:'project',id,expectedLocalRevision} — доступная собственная 1С-работа; id 1…80 символов [A-Za-z0-9._-], expectedLocalRevision безопасное целое>=0.

workspaceDigest относится к сериализованной сохранённой проекции workspace+stdin, а не к timestamp. Он не является ACL. Сохранённый ID не предоставляет права: adapter перед чтением файла проверяет захваченный контекст и действующий ownedOnec/ACL/readOnly. Затем validateWorkReferences сверяет binding, наличие файла и границу cursor. Чистый shape-check не объявляется доказательством авторизации.

lastResult — ровно {kind,runId,contentRevision,workspaceRevision,workBinding,inputSnapshot,sourceDigest,stdinDigest,output,exitCode,providerId}:
- kind = runtime / external-self-report;
- runId — уникальный ID захваченного запуска/явной записи, та же строковая грамматика1…80; contentRevision как выше;
- workspaceRevision — безопасное целое>=0 конкретного смонтированного workspace; это НЕ stateRevision и НЕ project.sync.localRevision;
- workBinding — исторический binding запуска; inputSnapshot описан ниже;
- sourceDigest/stdinDigest — lowercase SHA-256, вычисленные из снимка; null только у внешнего самоотчёта без снимка;
- output={stdout,stderr}, строки с общим пределом16384 UTF-8 байт на оба потока;
- exitCode — безопасное целое либо null; providerId — ID фактического provider для runtime; у external оба null.

Runtime разрешён здесь только для C++; требует snapshot и binding. У внешнего1С-самоотчёта binding и snapshot могут быть null. Если приложен browser snapshot, это лишь приложенный браузерный текст, не доказательство исполнявшегося модуля Конфигуратора. Никаких attempts/complete/final-assessment из сохранения результата. codeVerifiedServer=false и credentialEligible=false остаются границей доверия; эти флаги вообще не являются редактируемыми полями clarityDraft.

Снимок inputSnapshot — {languageId,source,stdin,entryFile,files,metadata}; languageId=cpp/bsl/1c-query по теме, строки source/stdin сохраняются точно; files — до128 элементов {path,content}, уникальные безопасные пути, source равен содержимому entryFile; metadata={entryFile,activeFile,workspaceRevision}. Все переданные текстовые файлы, включая headers, входят в снимок. Бинарный/неподдержанный request или дополнительная значимая runtime metadata приводят к отказу записи снимка, не к изменению запроса/запрету штатного запуска. Это предел нового evidence, не новый runtime cap.

Сериализация: ключи объектов и пути файлов упорядочены по байтам UTF-8, JSON без пробельного форматирования. Переводы строк, stdin и содержимое не нормализуются. sourceDigest = SHA-256 этой сериализации snapshot без stdin; stdinDigest = SHA-256 точного UTF-8 stdin. Метаданные actual request входят в sourceDigest. Чистая синхронная SHA-256 проверяется по известным векторам и Node crypto, включая миллион байтов. Для совпадения результата дополнительно нужны текущие контекст/instance/runId и ревизия, одних digest недостаточно.

| Объект | Предел |
| --- | ---: |
| Free answer | 4096 UTF-8 байт |
| reportDraft | 16384 UTF-8 байт |
| stdout+stderr | 16384 UTF-8 байт совокупно |
| Полная сериализация inputSnapshot | 32768 UTF-8 байт, включая пути, source, stdin, JSON и metadata |
| Полная сериализация clarityDraft | 65536 UTF-8 байт |

Одновременное достижение отдельных максимумов может превысить общий. Запись тогда отклоняется целиком без усечения или удаления старого ответа/результата. Поле не содержит текущий код второй раз: inputSnapshot только исторический, не источник обычного редактирования. Один lastResult, без массива запусков, checkpoint-ссылок и автоматического checkpoint. Большой прежний workspace по-прежнему сохраняется/исполняется штатно; отказ записи его полного snapshot не блокирует это.

## 3. Общая координация state:v1 — PROPOSED, требуется решение 01/02

Проверка исходников выявила ВСЕ действующие продуктовые пути записи этого ключа: core/storage.js; его вызовы из core/app.js, core/migrations/cpp-v7.js и pwa/offline-center.js. account-storage.js содержит allowlist/одноразовое legacy adoption; его контракт не изменяется. Новый field-only lock недостаточен.

Предлагаемый API withCourseStateWriter(fn) располагается в core/storage.js. Navigator Web Locks key = nexus:cpp-course-state:writer:<encodeURIComponent(accountId)>. Facade и объект проверенного Account-контекста захватываются ДО ожидания. После получения lock и перед каждым read/write проверяются те же ссылки/действующий facade. При недоступном Web Locks — явный отказ записи, не небезопасный fallback.

Критическая секция синхронная: никаких await, runtime, сети и пользовательских диалогов. Существующие sync saveState/updateState/patchLesson/toggleLesson/patchPracticum разрешены только внутри неё. Внутренняя lease действует лишь во время вызова fn и сбрасывается finally. Async callback/reentry не принимается; ожидания выполняются до/после секции. Это не длительная аренда вкладкой.

| Writer | Координация в будущем changeset |
| --- | --- |
| Lesson workspace/code/stdin, reset и clarity-open | Очередь захваченных редакций в core/app.js; короткий общий lock; ожидаемый digest сохранённой рабочей проекции, взятый при открытии/последнем ACK. init не записывает заготовку |
| toggleLesson, quiz, practicum tasks | Тот же lock, строгое свежее чтение, patch только выбранного поля. Для tasks операция над актуальным Set под lock, не stale массив до ожидания |
| Practicum workspace/reset | Тот же захват/ожидаемый digest/ACK, как у lesson. Не просто fire-and-forget Promise |
| updateState / saveState whole-object | Нельзя подставить свежий baseline к старому объекту. Сравнить raw source-token, зафиксированный loadState под текущей lease; новый объект от mutator связан с тем же token |
| importLegacyCppV7 | Вызов в core/app.js оборачивается общей lease. Содержимое core/migrations/cpp-v7.js и алгоритм миграции остаются прежними |
| Импорт local copy в Account | В pwa/offline-center.js существующий withProjectWriter, затем course-state lock; read/transferPlan и синхронные project mutations/saveState выполняются после получения обоих. saveState(plan.state,{expected:capturedState}) сравнивает именно raw token исходного чтения |
| Новый clarityDraft | Тот же lock, strict current container, expectedStateRevision + prepareClarityDraft, изменяется только clarityDraft в свежем lesson |

Для C++ lossless strict read проверяет JSON, schemaVersion===1, object-форму courses и затрагиваемого cpp/lessons/lesson. Некорректное значение не заменяется default state. null означает отсутствие контейнера, а не parse failure. Прежние неизвестные поля вне нового clarityDraft сохраняются побайтно по значениям; неизвестная версия/повреждение внутри draft также блокирует его перезапись. Обновление updatedAt сохраняет прежнюю семантику, timestamp не заменяет CAS.

Запись: captured context → общий lock → strict reread → ожидаемые raw/work/draft revision → разрешённая узкая mutation → размеры → setItem → same-context readback exact serialized bytes → receipt. Внешнее изменение после readback является новым событием, не поводом объявлять прошлый ACK универсальной гарантией. Ошибка readback после успешного setItem — «подтверждение не получено», не автоматический rollback; повтор не обходит конфликт. Повреждённый raw и неизвестная версия не диагностируются приватным текстом.

Workspace и draft — две операции даже внутри одного логического ухода; workspace сначала, draft после. Нет обещания общей транзакции разных хранилищ. При частичном успехе сохраняется новый workspace, прежний draft/lastResult не уничтожается. Не откатывать чужую возможную новую запись. Конфликт не разрешается автоматической заменой expectedRevision последней.

Порядок вложения locks при импорте всегда project writer → course-state writer; обратный порядок не используется. Обычное сохранение 1С-проекта освобождает project writer до операции draft. Старые прогресс/attempts не создаются ради обхода draft API.

**Запрашиваемое точное расширение scope:** pwa/offline-center.js только для участия существующего импорта в этой координации. Оно необходимо: оставить этот writer вне lock означает ложную гарантию. Сейчас файл не изменён. Защиты migrations/Identity/vault/project-store не снимаются.

Этот протокол защищает участвующие writers одной версии кандидата. Уже открытый старый бинарный frontend, игнорирующий lock, не становится безопасным задним числом. Mixed-generation записи не объявляются поддержанными; перед выпуском нужен отдельный cross-generation gate. Пилот без публикации проверяется в изолированных синтетических профилях одного кандидата. Это не разрешение трогать рабочие аккаунты владельца.

## 4. 1С и vault — PROPOSED

1С: новый метод saveClarityDraft(topicId,draft,{expectedStateRevision}) в createCandidateStore, только courseId=onec и два ID. Вызывать под существующим nexus:onec-candidate:all-courses — тем же lock, что wrapAction для attempt/complete/createProject/editProject/copyProject. Нельзя открывать независимый lock для draft. Контекст createOnecAccountStorage/isCurrent перепроверяется после ожидания. В model strict reread и изменение только clarityDraft; остальные lesson поля сохраняются. Для createCandidateStore('1c-enterprise') поведение и запись остаются прежними, отдельный regression обязателен. Сторонний прямой вызов model без согласованного browser lock не входит в гарантию.

Собственная1С-работа: withProjectWriter(() => saveOnecWork(workId,workspace,{expectedLocalRevision})). expectedLocalRevision = project.sync.localRevision, захваченная при открытии/предыдущем ACK; не workspace.revision и не прочитанная перед записью последняя. Сохраняются ownedOnec, ACL, readOnly и ограничения файлов. После успеха binding получает новую возвращённую revision. Draft сбой после work save показывает частичный успех.

C++ vault: используются существующие save/settled и конкретный Promise session.save(snapshot). Receipt {id,revision,branched} после транзакции — подтверждение операции. session.flush() отдельно им не является: tail поглощает rejection. branched=true означает отдельную копию; следующие bindings/URL/resume используют возвращённый id/revision и это сообщается пользователю. Общий предел32MiB не меняется.

В пилотном offline lesson-path простое чтение не вызывает exerciseCopy. Уже существующий exercise-project переиспользуется; без него текущая lesson workspace остаётся источником, пустая работа создаётся только явным действием ученика/первой правкой. Остальные уроки и прежние exercise-projects не переделываются и не удаляются. Объяснение/RU↔EN/самопроверка не создают проекты.

## 5. Захват, очередь, переходы и отзыв доступа — PROPOSED

Добавочное studio.captureForPersistence() синхронизирует textarea с существующим workspace и возвращает files/entryFile/activeFile/revision + свежие selection/scroll. stdin захватывается отдельно тем же синхронным действием. Это не save. getSnapshot(), sync() и callback onWorkspaceChange сами не подтверждают запись. init только инициализирует вид, не сохраняет пример.

Редакция UI bufferEpoch монотонна и неперсистентна. Очередь использует захваченные snapshot/context/instance/epoch. ACK очищает dirty только той же редакции в том же instance; новый ввод во время save остаётся dirty. Сбой не поглощается как успешный settled. Повтор выполняет новый захват, но не заменяет ожидаемую сохранённую ревизию чужой.

Три этапа одной темы меняют видимость, не remount редактора; workspace и undo/redo сохраняются. Уход/RU↔EN/back-forward: capture → save workspace → save draft → ACK обоих и проверка epoch/context → смена принятого маршрута и unmount. Если ввод обновился, переход не завершается до нового подтверждения. Ошибка остаётся внутри текущего экрана, не передаётся общему renderFailure, который заменяет DOM.

До изменения language prefs хранится принятая локаль; отклонённый переход восстанавливает принятый hash/locale через replaceState и suppression token, без рекурсивного hashchange. Исключение — принудительный Account lock/logout: он не задерживается ради autosave.

| Событие | Поведение |
| --- | --- |
| Quota/лимит/ошибка записи, контекст действителен | Буфер и dirty/error сохранены; управляемый уход остановлен; явные retry/export |
| Stale revision | Чужая запись не перезаписывается. Своё содержимое остаётся в действительном контексте. Явное сравнение/экспорт/отказ, без молчаливого retry |
| Corruption/unknown schema | Сохранённый raw неизменён, безопасный код ошибки без приватного payload |
| Account changed/logout/forced lock/pagehide | Отмена callbacks/writes прежнего context token; скрыть/освободить приватный UI и память. Не задерживать bootstrap lock; не переносить данные новому пользователю; не auto-export |
| Добровольный lock vault | До перехода дождаться save receipt либо явного решения отказаться от несохранённого. При forced invalidation доступ прекращается сразу |
| Late save/run | Не менять статус нового instance. Результат принадлежит захваченным context/mount/runId |
| F5/close/crash | Только подтверждённые записи восстановимы. beforeunload — предупреждение, не гарантия commit/power-loss durability |

Никакого unscoped recovery-key. Свободный ответ, report и snapshots не передаются автоматически в ассистента, Content/Learning Events, public evidence или телеметрию. Для вывода текста textContent/escaping, не исполнение HTML.

## 6. Opt-in runtime hook — PROPOSED

sandbox/sandbox.js получает необязательный наблюдатель фактического request и соответствующего result/error. Перед первым await — detached snapshot всех actual request.files/source/entryFile/stdin/известной metadata, workspaceRevision, digest, runId, ссылка на mount и captured context, binding. Snapshot заморожен. Для большого/неподдержанного snapshot фиксируется невозможность сохранить evidence; штатный runtime остаётся доступным.

После await проверяются те же context и mount по ссылочной идентичности, runId, текущий request/digests и workspaceRevision. Сам resultMatches из чистого модуля проверяет содержимое, но не выдаёт доступ и должен вызываться только после этих контекстных проверок. При смене только stdin старый result не подтверждает новую работу. Старый вывод можно показать исторически только пока прежний контекст доступен.

Не читать result из DOM; не считать click и runtime-evidence.complete оценкой задания. Не менять compiler/provider/router/ABI/лимиты и существующие runtime tickets/применение generated files. Callback не отправляет исходники по сети, а ошибка сохранения evidence не превращает успешный запуск в ложный compile error.

## 7. Точная поверхность changeset

Уже реализовано и может проверяться отдельно:
- core/cpp-clarity-r3-state.mjs — чистый контракт; не импортируется продуктом.
- tests/cpp-clarity-r3-state.test.mjs — синтетическая адресная проверка.
- tools/check-cpp-clarity.mjs — включить её в обязательный gate.
- tools/check-cpp-clarity-preservation.mjs — только точное имя нового чистого модуля; прежние protected files/trees и baseline неизменны.
- соответствующая документация/evidence.

После решения01/02:
- core/storage.js — strict read, общая короткая lease, source token, новый field writer;
- core/app.js, core/cpp-clarity-presentation.js — очередь старых writers, guarded navigation, lazy pilot;
- pwa/offline-center.js — только точная координация переноса, указанная выше (новое запрашиваемое исключение);
- pwa/offline-entry.js — binding к существующей vault queue, guard, убрать auto exerciseCopy только для одной пилотной темы;
- sandbox/code-studio.js — captureForPersistence; sandbox/sandbox.js — opt-in run observer;
- courses/onec-education/model.mjs, candidate.mjs, integration.mjs — закрытый метод, тот же lock, два topic ID, lifecycle bridge;
- новые lazy core/cpp-clarity-r3-session.mjs и core/cpp-clarity-r3-renderer.mjs — orchestration и один общий screen;
- адресные cpp-clarity тесты; старые browser fixtures, вызывающие mutators напрямую, получают тот же writer wrapper, без изменения assertions/допусков.

Пока исключения для этих будущих protected файлов НЕ внесены. Нельзя убрать целое дерево sandbox/onec-education из protection или заменить baseline. account-storage, account-progress, learning-context, view-resume, project-writer/store, studio-store, local-vault и migrations переиспользуются без переписывания.

Новая логика lazy; текущие80/80 modules и639921/640000 bytes не дают запаса для прямого static import. При подключении вынести существующие lesson-handlers в lazy adapter в разрешённом core/app.js, не повышая caps. Gate обязан проверить итоговый граф, не считать это уже достигнутым.

## 8. Матрица и повторное решение

Чистые тесты: schema/foreign questions/revision conflict; ответ после смены material revision; UTF-8 и JSON escaping; каждый предел и +1; совокупный лимит; snapshot paths/headers/stdin/digest; runtime match; внешний самоотчёт без Studio. Они не доказывают работу browser writer.

Будущая интеграционная матрица обязательна: две синтетические учётные записи; две вкладки draft↔draft и draft↔legacy autosave/progress/import; ввод во время save; lock/late callbacks; malformed container/raw-preservation; partial work/draft; vault failure/branch/reopen/cold offline; смена языка/сосед/back-forward; реальные cursor/undo/файлы/stdin; no automatic project/attempt/completion; baseline 67/40 IDs,1c-enterprise и performance. Методическое понимание и учебная1С1508 — отдельные gates.

Запрос01: подтвердить закрытую схему/strict write/отзыв доступа/vault receipts и разрешённые пути; отсутствие отдельного offline1С сохранить.
Запрос02: подтвердить конкретный общий writer protocol, включая pwa/offline-center.js, capture/ACK/navigation/run hook и отказ oversized snapshot без checkpoint. Только review, без параллельного кода.

Все девять замечаний сейчас ADDRESSED IN CONTRACT / RE-REVIEW PENDING, не самоприсвоенный CLOSED. Merge, production deployment и Release запрещены. RECOMMENDED MODE: очень высокий.
