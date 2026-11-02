# MASTER 00 — полный кандидат двух курсов 1С, 31.10.2026

**STATUS: PARTIAL общей готовности к публикации.** Материалы и итоговая аттестация всех 20 модулей — IMPLEMENTED. Scoped automated/native/browser результаты ниже — AUTOMATED PASS. Полный Gold/LIVE PASS двух курсов и публикация не объявляются: S2 и непроверенные платформенные/приёмочные сценарии остаются открытыми.

## COMPARISON #62 vs #63 / UNIQUE CONTENT RETAINED

Единственный implementation candidate — PR #63, feature/onec-dual-gold-foundation-20261030. Сравнение 95 тем #62 с 80 прежними #63 уже закрыто отдельным актом CONSOLIDATION_RU.md. Полный архив source62, TOPIC_MAPPING и RETAINED_MATERIALS сохранены. Перенос выборочный: полезные компетенции и две дополнительные лаборатории, ServiceCost, паспорт среды, требования к ссылкам/данным и 4 отдельные темы; дублей курсов нет. Консолидация дала 84 темы. В текущем шаге все 84 ID/порядок и старые 17 уроков/34 локализации сохранены; source62 и старые native/evidence пакеты не переписывались.

## CANONICAL CURRICULUM

Профессиональное направление onec: 12 модулей/52 темы. Прикладное 1c-enterprise: 8 модулей/32 темы. onec-programming существует лишь как историческое исходное имя в provenance #62. Новая реализация добавила 67 тем/134 RU/EN, всего 84/168. Каждая новая локализация содержит собственную теорию, примеры, интерактивную схему, практику 3 уровней, лабораторную, отрицательные случаи и критерии. Общий модульный контекст обозначен theoryContext; количество слов само по себе не является педагогической приёмкой. Независимые IDs/progress/attempts двух курсов и shared prereqs без переноса completion сохраняются.

Каждый курс завершается 3 вариантами по 24 вопроса с покрытием всех модулей, 4 практическими работами и 3 проектами на выбор. Банк P: 72 вопроса; A: 48. Это локальная самопроверка с открытыми ответами, историей попыток и портфолио, не защищённый экзамен. Проекты требуют самостоятельного изменения, отрицательных сценариев, восстановления и доказательств. Рубрики 100 баллов и критические условия опубликованы. Серверного/native/преподавательского зачёта автоматически нет.


| Направление | Модуль | Тем | Результат |
|---|---|---:|---|
| onec | P1 | 4 | Архитектура платформы, базы и среды разработки |
| onec | P2 | 5 | Основы BSL |
| onec | P3 | 5 | Модули, функции и коллекции |
| onec | P4 | 4 | Проектирование метаданных |
| onec | P5 | 4 | Документы и транзакционные изменения |
| onec | P6 | 5 | Регистры и учётные модели |
| onec | P7 | 4 | Запросы и производительность |
| onec | P8 | 4 | Управляемые формы и контексты |
| onec | P9 | 4 | СКД, отчёты и обработки |
| onec | P10 | 5 | Надёжность, безопасность и диагностика |
| onec | P11 | 4 | Интеграции и фоновые операции |
| onec | P12 | 4 | Профессиональная разработка и итоговая работа |
| 1c-enterprise | A1 | 4 | Первое знакомство и безопасный учебный стенд |
| 1c-enterprise | A2 | 4 | Информационные базы и объекты |
| 1c-enterprise | A3 | 4 | Данные, поиск и отчёты |
| 1c-enterprise | A4 | 4 | Первые изменения в Конфигураторе |
| 1c-enterprise | A5 | 4 | Справочники, документы и формы |
| 1c-enterprise | A6 | 4 | Администрирование и сохранность |
| 1c-enterprise | A7 | 4 | Отчёты и прикладные настройки |
| 1c-enterprise | A8 | 4 | Итоговый прикладной практикум |

## CI / EVIDENCE

Локально 37 regression groups/140 unit checks PASS, включая Content ContractCP1.1, RU/EN/ID contracts, C++final23checks, Studio/Cloud/PWA/graphics, scope preservation и NEXUS-PERF-01. Браузер: 21 course/final/offline groups+17 Studio groups PASS; 168 текстов×4 размера 1366/390/375/320 и холодный offline, ответы/версии/копии/reload/quota/повреждения/экспорт, реальный межвкладочный shared Storage и C++stale revision. Это Chromium и синтетические account fixtures, не физические устройства или real-account LIVE.

Настоящая 1С 8.3.27.2214: 70 core+3 HTTPcase IDs, 8 positive sessions, backup/restore, source440→copy455 при source440, синтаксическое и семантическое отклонение. Полная привязка 12 исходников/runner/spec/results по SHA256 в evidence/native/MANIFEST.json. Данные только учебные. Не все возможности платформы исполнены: точные ограничения в NATIVE_COVERAGE.json. Native reference не является Studio sandbox для ученика.

Автономный HTML менее 650000 байт, gzip только данных, без eval и без платформы 1С. Отдельная preview сборка проверяет 7292 файл и 378 файлов активного C++поколения побайтно, настоящую установку SW и reload двух finals/P12 без сети. Build не развёртывался. Приватный холодный Studio/offline не принят.

NEXUS-PERF-01: 80 startup modules/634989 bytes при прежних caps80/640000. Qt на startup не добавлен; полевой p95 не измерен. Failed experiments и реальные исправления сохранены отдельно. Финальные GitHubSHA/CIruns/artifactdigest будут зафиксированы в описании этого же Draft PR после запуска текущего HEAD; исторические SHA не выдаются за новый CI.

## P4-Q и границы

P4-Q — исторический допуск конкретного выпуска C++/платформы, а не старый выпуск 1С. Новое наполнение не получает его release admission. Маршрут content-review проверяет exact31 owner-approved paths/modes/hashes, unknown/protected изменения требуют отдельного release review. В historical publication job нет изменения условий безопасности; меняется только trusted bootstrap pin на конкретный проверенный commit. Publication должна быть SKIPPED, releaseEligible=false. Admission/receipts/allowlist и root production SW сохранены. Настройки required checks на GitHub административно не аудированы.

## NEXT / RISKS

S1-R06 закрыт в пределах текущих согласованных writers: общий lock+CAS+localRevision и pure reads. Перед будущим переключением нужны backup и reload старых вкладок. Identity/OAuth/IAM/BFF/Worker/D1/endpoints не менялись. Shared writer и публичный PWAfragment объявлены routing 02/01/07 и зафиксированы в STORAGE_SECURITY_REVIEW_RU.md; независимая security приёмка остаётся обязательной.

До Gold publication остаются: права точной training-поставки и доступный изолированный guest; S2 snapshot/result/provider; реальное прохождение непроверенных форм/СКД/roles/concurrency/scheduling/EDT; независимая предметная и педагогическая рецензия; real-account S1 LIVE и physical/WebKit/accessibility/performance evidence; затем новый выпускной gate 05/07. Основной каталог пока сохраняет PLANNED, курс открывается через candidateRoute. Нельзя выдать наличие текстов за полностью готовую к публикации образовательную среду. codeVerifiedServer=false, credentialEligible=false; эффективность и авторство не доказаны.

Main/production/merge/deploy/официальный Release не выполнялись. Новый PR не создавался, дополнительные платные услуги не применялись.

## ROUTING CHECK

Есть ли здесь материал для диплома? Да: независимые траектории с shared prerequisite без переноса mastery, source-bound native evidence, сохранность при межвкладочных writers, честные границы self-report/runtime и отрицательные эксперименты. Для 04 нужны архитектура до/после, альтернативы и измеренные результаты из этого пакета; педагогический эффект остаётся гипотезой.

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03 CONTENT PRODUCTION/05 EVIDENCE. Результат: полный authored candidate84 темы RU/EN+итоговая аттестация+нативный reference и сохранность.

Куда по приоритету: 00 MASTER→02 Studio/01 Security→05 Release/07 Mobile→04 Diploma; 06 только методология независимой педагогической оценки. Когда: сейчас, после текущего evidence milestone, до следующего крупного этапа.

Готовый текст для вставки:

«MASTER 00, 31.10.2026. STATUS: PARTIAL общей публикационной готовности, IMPLEMENTED84 темы/168 RU/EN в 20 модулях, IDs/progress/provenance сохранены. Только PR #63. Итоги каждого курса: 3×24 теория, 4 практики, 3 проекта. AUTOMATED PASS37 regression/140 unit, 38 browsergroups; native8.3.27.2214 — 70 core+3 HTTP, 8 сеансов, 440→455/source440, restore/identity/negativecontrols. R06 исправлен общим writer+CAS для текущих браузерных writers; старые вкладки требуют backup/reload. Публичный PWAfragment ограничен exact hashed HTML двух курсов. Main/production/merge/Release не затронуты, исторический P4-Q не ослаблен. Открыты S2 права/guest/isolation/provider, непроверенные platform labs, independent security/pedagogy и real-account/physical/WebKit приёмка. Полный отчёт и хешированные доказательства: docs/ru/03-content/onec/full-course-20261031/REPORT_RU.md; итоговый SHA/CI — в PR #63. Просьба 02/01 принять shared writer review и S2 контракт; 05/07 проверить evidence и остаточные gates; 04 сохранить архитектуру и failed experiments без приписывания pedagogyPASS.»

Что потом: продолжить в том же PR #63 с 02/01 по изолированному настоящему запуску и непроверенным лабораторным; приёмка 05/07 перед отдельным решением о выпуске. Самостоятельные сообщения в другие чаты не отправлялись.

NEXT RECOMMENDED BRANCH: 02 совместно 01, образовательный владелец 03. RECOMMENDED MODE: Высокий для содержания, Очень высокий для licensing/runtime/security/release.
