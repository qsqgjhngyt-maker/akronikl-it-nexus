# Учебный стенд и модули A2/P2

31.10.2026. **STATUS: IMPLEMENTED / AUTOMATED PASS в пределах кандидата; полный продукт PARTIAL / NOT PUBLISHED.** Один рабочий поток, существующий Draft PR #63. Main, production, merge и официальный Release не изменялись.

Входной SHA: `8330fd232856fc4076929ddade6e81cfaa8c0e4f`. Итоговый commit и его CI фиксируются в PR metadata; старые CI-результаты не выдаются за проверку нового HEAD. Старые материалы A1/P1 и предыдущие evidence остаются историей.

## Образовательный результат

Разработаны **9 новых уроков / 18 RU/EN payloads**: A2 — 4, P2 — 5. Всего в кандидате **17 уроков / 34 локализации**. Все 84 Topic ID и их порядок сохранены; оставшиеся 67 тем PLANNED. Course IDs `onec` и `1c-enterprise` независимы; вход в P не требует зачёта A.

| Topic ID | Результат урока | Реальная проверка и ограничение |
| --- | --- | --- |
| 1c-enterprise.a2.topic-1 | База/режим/копия; различие workspace ID и identity записей | Seed, reopen, restore, source/copy comparison; ручной UI отдельно |
| 1c-enterprise.a2.topic-2 | Справочники, элементы, ссылки, одинаковые имена | 3 клиента, 2 услуги, C001≠C003 при одинаковом имени, ссылки двух документов |
| 1c-enterprise.a2.topic-3 | Документ, запись, статус и проведение | 2 сохранённых документа; posting запрещён; 2 неверные записи отклонены |
| 1c-enterprise.a2.topic-4 | Список/форма/контекст/история, составные отборы | Нативная сохранность и связи + отдельная браузерная модель; ручная навигация не приписывается batch |
| onec.p2.topic-1 | Лексемы/присваивание/выражения, RU/EN keywords | 6 native cases, включая 10/18/1.5 и два вызова 30+45=75 |
| onec.p2.topic-2 | Тип, Неопределено, Null, ноль, преобразование | 9 native cases, включая ошибку конверсии и ЗначениеЗаполнено(0)=Ложь |
| onec.p2.topic-3 | Решения/ветви/логика/границы | 7 native cases: -1/0/60/61/1440/1441/строка |
| onec.p2.topic-4 | Для/Пока/Для Каждого, инвариант, выход | 7 native cases: 75/пустой 0, завершение, Continue/Break, invalid element |
| onec.p2.numbers-dates-locales | Числа/формат/дата/строка/локаль | 6 native cases: десятичная сумма, стоимость, 12.50, компоненты даты, секунды, длина |

Каждый новый урок содержит четыре самостоятельных раздела теории, два разбираемых примера, walkthrough, три уровня практики с критериями, лабораторную с expected/evidence/negative, ошибки и вопросы с объяснениями. RU/EN answer keys и scope совпадают. Добавлены девять интерактивных схем в `shared.a2p2.v1.json`; это объясняющие модели, не запуск BSL. Отдельный A2/P2 набор в браузере содержит две заявки/75 минут и явно отделён от информационной базы. Старые shared v1 и REQ-fixture A1/P1 не заменяются.

Официальные первичные источники добавлены для [справочников](https://v8.1c.ru/platforma/spravochniki/), [документов](https://v8.1c.ru/platforma/dokumenty/) и [элементов формы](https://v8.1c.ru/platforma/elementy-formy/). Тексты, данные и метаданные стенда оригинальные; установщики и чужие конфигурации не включены. Происхождение не подменяет независимый rights review.

## Настоящий стенд 1С

`courses/onec-education/native/service-desk-a2p2/` — отдельная конфигурация `0.2.0-a2p2`: справочники Клиенты/Услуги, перечисление статусов, документ ЗаявкаУслуги с ссылками, длительностью и проверками ПередЗаписью, подсистема и стандартные формы платформы. Старый `service-desk/` A1/P1 побайтно сохранён.

Native gate `tools/check-onec-native-next.ps1` выполнялся на официальной установленной 8.3.27.2214, Windows, файловая база, толстый клиент управляемого приложения. Подпись исполняемого файла Valid. Профиль лицензии и архитектура платформы NOT_INSPECTED; это не заменяется предположением по имени каталога. Условия EULA и public training 8.3.27.1508 остаются отдельным gate.

Фактически проверено:

1. Три клиента, две услуги и два документа реально записаны. Итог 30+45=75; C001/C003 имеют одинаковое представление, но разную identity.
2. Повторный seed сохраняет количество и ссылки, не перезаписывает существующие элементы. Новый сеанс читает те же данные.
3. Dump/restore в **новую** базу сохраняет identity и реквизиты. Рабочие пространства имеют разные ID с provenance; GUID записей при restore сохраняются.
4. В копии второй документ меняется с 45 до 60, итог 90 переживает новый сеанс. Повторное открытие источника снова даёт 75; snapshots источника совпадают.
5. Пустой клиент и отрицательные минуты отклоняются; число документов остаётся 2. Проведение/движения регистров не выполняются.
6. **46 уникальных cases** (35 P2 + 11 A2) проходят в каждом из **7 положительных сеансов**. Отдельный восьмой сеанс — семантический отрицательный контроль.
7. Испорченный синтаксис отклонён CheckConfig (101). Синтаксически допустимое вычитание вместо сложения принято CheckConfig, но реальная проверка выдаёт `FAIL|NEXUS_CHECK_FAILED: P2.1.russian-keywords`.
8. Повторный output-каталог отклоняется до работы с базой; SHA256 исходной базы до/после совпадает.

Тот же полный цикл повторён из переносимого offline-комплекта. Canonical native evidence относится к этому финальному portable-run; предыдущий repository report сохранён отдельно в history. Все девять metadata/module hashes и runner hash проверяются unit gate. `.dt`, базы и private logs остаются локально; публикуются только безопасные summaries/cases/snapshots. Их текст нормализован в UTF-8 без BOM с LF; XML/BSL source hashes относятся к точным исходным bytes. Руководства RU/EN: `native/README_A2P2_RU.md`, `native/README_A2P2_EN.md`.

## Сохранность работ и прогресса

Все прежние 84 ID и порядок сохранены. Все 16 payload A1/P1, shared v1 и их native kit не менялись. Дополнены CP-1.1 activity mappings, существующие project IDs сохранены; добавлен отдельный native-project metadata ID. Skill Graph, Learning Events, Mastery и защищённая аттестация не объявляются реализованными.

Storage keys прежние. Чтение обновлённого курса не переписывает сохранение. Старые attempts/projects/provenance и завершение A1/P1 остаются. Доступный объём расширяется до A=8/P=9 уроков, поэтому процент может измениться при прежнем числе выполненных.

Для новых A2/P2 действует `current-revision-required`: прежняя legacy запись, созданная до появления урока, сохраняется как история, но не засчитывает его текущую ревизию автоматически. Новая попытка `0.3.0-a2p2` и отдельный самоотчёт создают текущую отметку. Копия заметок получает новый ID, не меняет источник и не переносит completion другого курса. Автоматической записи результатов 1С в аккаунт Nexus нет.

## Проверки и производительность

Локально: **60 unit checks** (37 candidate, 10 CP-1.1, 10 routing, 3 Intro), **25/25 regression groups**, **15 browser groups**. Все 34 локализации проверены при 1366/390/375/320, включая overflow, схемы/клавиатуру, source links, новые примеры, A2 отборы 2/75→1/30→0/0→1/45→2/75, legacy progress/revision, copy/reload/XSS/quota.

Cold offline: сервер выключен, сеть запрещена, все 34 тела доступны, новая попытка P2/completion/reload сохраняются. HTML **487763 bytes**, SHA256 `d521e7a65367d5050737486c3965d9716f84fff8ab4a4557f43f10443256469c`, ниже прежнего 650000-byte budget. Платформа не включена. Main startup graph прежний **79/629956**, NEXUS-PERF-01 сохранён; field p95 не измерен.

Evidence: [a2p2/evidence](a2p2/evidence), `RESULT.json`, hashes, native/portable outputs, browser screenshots и полный regression log. GitHub SHA/runs/artifacts итогового HEAD указываются в PR metadata после CI. Положительный Content review не запрашивает историческую публикацию; P4-Q receipts/allowlist и согласованный routing не менялись.

## Неудачные эксперименты

| Проблема → гипотеза | Попытка и результат | Решение и regression |
| --- | --- | --- |
| Первые XML не содержали InternalInfo и использовали неверное имя свойства | Designer отклонил оригинальный probe, исходный output сохранён | Добавлены generated types, корректное Autonumbering; новая база load/check PASS |
| Запрос недоступен при проверке thin-client контекста | CheckConfig отклонил модуль | Тестовый модуль явно ограничен managed thick client; scopes описаны, новый check/native PASS |
| Наследованный browser assert ожидал 1/8 для P | Реальный UI показал 1/9 после добавления пяти P2 | Исправлено ожидание объёма, не прогресс пользователя; 15 browser groups PASS |
| Новый unit helper имел лишнюю скобку | SyntaxError, проверки не объявлялись прошедшими | Упрощено сравнение identity shape; все 37 candidate checks PASS |

## Остаток и ограничения

- Training 8.3.27.1508, полные EULA/community/EDT и license profile не закрыты. Дистрибутивы и сторонние tools не распространяются.
- Ручной desktop UI протокол форм 1С, физические Android/iPhone, WebKit/assistive technology и field p95 NOT RUN. Batch-успех не выдаётся за эти проверки.
- Native gate относится к thick-client/file-base среде. Сервер, concurrency, транзакции/проведение/регистры не доказаны.
- Academy/account-private/Studio/PWA adapters не подключены. Подсветка/JS не считаются 1С исполнением. Production course cards остаются PLANNED.
- Независимая предметная/security/педагогическая экспертиза, измеренный образовательный эффект и авторство ученика не доказаны. Required-check settings main не прочитаны из-за API 403 и не менялись.

## Передача milestone

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03 CONTENT PRODUCTION, один исполнитель PR #63.

Результат: A2/P2 IMPLEMENTED, настоящий persisted-data стенд и portable native gate; 17 уроков/34 RU/EN тела; прежние работы и прогресс сохранены.

Куда: 00 MASTER → 05 evidence; 04 ВКР; 02/01/07 — отдельные integration/UX contracts.

Почему: изменён образовательный объём и доказаны сохранение/копирование прикладных данных; внешние contracts не менялись.

Когда: после CI итогового HEAD, перед новым крупным этапом или merge/release решением.

Готовый текст: «A2/P2 разработаны в единственном #63: 9 новых RU/EN уроков, всего 17/34; все 84 Topic ID сохранены, 67 тем PLANNED. Официальная 1С 8.3.27.2214 записала 3 клиента/2 услуги/2 документа; repeat/reopen/restore сохранили identity, копия 90 при исходнике 75. 46 cases ×7 положительных сеансов плюс semantic-negative, syntax-negative и output guard; portable повторён. 60 unit/25 regression/15 browser groups локально PASS. New revision не присваивается legacy attempts; исходные A1/P1 и contracts сохранены. Main/production/merge/Release не выполнялись. Полный продукт PARTIAL; training/EULA, manual UI, physical mobile, Studio/account integration и independent review остаются gates. Итоговый SHA/CI/artifacts — в PR metadata».

Есть ли материал для диплома? **Да:** сохранность identity при restore, независимость workspace и данных, revision-aware progression без очистки истории, syntax vs semantic negative controls, границы native и браузерного evidence. Педагогический эффект не утверждается.

**NEXT RECOMMENDED BRANCH:** 05/03 — review milestone; 02 — согласованный Studio contract, затем A3/P3 в одном потоке. **RECOMMENDED MODE:** Высокий; runtime/licensing/security — Очень высокий.
