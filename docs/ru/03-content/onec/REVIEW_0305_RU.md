# Итоговый review PR #63 по линии 03/05

31.10.2026. **STATUS: PARTIAL / NOT PUBLISHED.** Исправления review IMPLEMENTED; локальные проверки AUTOMATED PASS. Слияние, публикация и общий LIVE PASS не утверждаются. Review выполнен тем же инженерным исполнителем; независимая педагогическая экспертиза не имитируется.

Проверенный входной HEAD: `54c504fa1553dfedd8f1e23dc4bc6dc7615f6a78`; база main: `d8721e06a2b1ac953aa18694c07559c62d388700`. Исправления и этот отчёт находятся в единственном [Draft PR #63](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/63). Последующий commit этой проверки указывается в PR metadata вместе с новым CI; отчёт не приписывает старые CI-результаты новому коммиту.

## 03 — содержание и замечания

| Проверка | Вывод и решение | Доказательство |
| --- | --- | --- |
| Curriculum и IDs | 84 темы: P=`onec` — 52/P1–P12, A=`1c-enterprise` — 32/A1–A8. Все исходные 80 ID, порядок и content paths сохранены; 4 добавления PLANNED. Все 95 source entries #62 сопоставлены. | Consolidation gate, baseline, source hashes |
| Shared и prerequisite graph | Shared v1/REQ-fixture побайтно сохранены, version pinning и отсутствие автоматического зачёта проверены. Прямой вход в P остаётся. Последовательный граф внутри каждой траектории сохранён как консервативный план; более гибкий DAG #62 не вводился. Структурный DAG PASS не доказывает оптимальность последовательности. | CP-1.1, consolidation negative tests |
| A1/P1 RU/EN | 8 разработанных уроков/16 payloads: конкретные цели, теория по четырём разделам, разбор, три уровня практики, лабораторная/negative/evidence, вопросы с объяснением. Сверены границы визуализации, анализа, нативного исполнения; учебные схемы не выдают за 1С. Остальные 76 тем PLANNED. | Content/CP tests, 16 locale render/source-link checks |
| REVIEW-01 из сравнительного review | Новые попытки имеют ID и ревизию; прежние unversioned/versioned attempts и completion history сохраняются. Дополнительно проверен переход A1.3 с 0.2.0 на 0.2.1. Старый результат не становится текущей ревизией при чтении. | Unit «Редакционная ревизия A1.3…», browser preservation |
| REVIEW-02 | **Воспроизведён на входном HEAD и исправлен в этом review.** До исправления неизвестная тема и PLANNED P2 принимали попытку/completion в локальной модели; общий прогресс при этом оставался 0. Теперь запись требует curriculum и IMPLEMENTED membership. Чтение/заметки совместимы, старые неизвестные записи не удаляются. | [MODEL_BEFORE_AFTER.json](review-0305/evidence/MODEL_BEFORE_AFTER.json), unit и browser negative checks |
| REVIEW-03 | Отдельная копия обязана иметь ID, отличный от источника; исходник и его provenance сохраняются, зачёт не переносится. Исправление из консолидации повторно проверено. | Unit copy identity, browser copy/reload/XSS |
| REVIEW-04 — A1.3 | В исходном walkthrough после клиента Альфа предлагалось выбрать «В работе» с ожиданием 45 минут, хотя пересечение даёт 0. Кроме того, предлагалась сортировка без элемента управления. Теперь явно сбрасывается клиентский отбор; перестановка ID выполняется в таблице протокола. RU/EN синхронны, Topic ID прежний. | Walkthrough RU/EN, browser 60→0→45→105, revision test |
| Происхождение/авторство | Exact archive #62, hashes, sourcePR/SHA/path и rationale сохранены. Это доказательство происхождения исходников, не независимый аудит исключительных прав или авторства ученика. | SOURCE62_MANIFEST, RETAINED_MATERIALS, TOPIC_MAPPING |

Версия candidate packages/manifests — `0.2.1-review`. Только редакционно изменённый урок `1c-enterprise.a1.interface` получает эту contentRevision; остальные семь уроков сохраняют `0.2.0-consolidated`. Curriculum явно фиксирует ревизию каждого разработанного урока; validator сверяет RU/EN payloads с ней. Shared v1 и storage keys не меняются. В production catalog курсы по-прежнему PLANNED, отдельный `onec-programming` не активируется.

## 05 — повторная проверка и evidence

- **27 candidate unit + 10 CP-1.1 unit**, **25/25 regression groups PASS**: Content Contract, C++/Studio/PWA/Cloud, syntax/import, performance и preservation. Полный список — [REGRESSION_RESULT.json](review-0305/evidence/REGRESSION_RESULT.json).
- **13 browser groups PASS**: все 16 локализаций при 1366/390/375/320, схемы/клавиатура, источники, фильтры/итоги, независимые работы, старый прогресс/attempts, XSS escaping, quota failure. Новая negative-проверка модели выполняется также в настоящем браузере. [BROWSER_RESULT.json](review-0305/evidence/BROWSER_RESULT.json).
- Cold offline: сервер выключен, HTTP-запросы заблокированы; уроки, две классификации, новая попытка/completion и reload прошли. HTML **274098 bytes**, SHA256 `6d47595c3c566cea21c5634319535ddeb7942c15d5b23443b5fcb44355eb0198`. Это новый артефакт; прежние offline hashes остаются историей. [Снимок](review-0305/evidence/offline-phone.png).
- Основной стартовый граф прежний: **79 modules / 629956 source bytes**, лимиты 80/640000 не менялись. NEXUS-PERF-01 сохраняется. Локальные timings не объявляются field p95. [PERF.txt](review-0305/evidence/PERF.txt).
- Нативный BSL **не запускался повторно в этом review**, потому что native sources и runner не менялись. Все три native source hashes и runner сверены с прежним реальным запуском. Доказательство 8.3.27.2214, 3/105/2, пяти ServiceCost cases до/после restore и negative CheckConfig=101 остаётся в consolidation evidence. [NATIVE_PROVENANCE.json](review-0305/evidence/NATIVE_PROVENANCE.json). Этот byte check не выдаётся за новый native-run или запуск training 8.3.27.1508.
- P4-Q gate, release receipt, completion receipt и маршрутизатор Intro побайтно равны main. По последующему прямому решению владельца изменена маршрутизация publication workflow; тело исторической job сохранено дословно. Добавлены 10 route unit и 3 Intro regression tests; совокупно 50 unit-проверок. Основное приложение, Identity/IAM/OAuth, BFF, Worker/D1, runtime/Project Studio/PWA contracts не менялись. [PRESERVATION.txt](review-0305/evidence/PRESERVATION.txt).

В начале локального браузерного запуска среда запретила loopback (`ERR_NETWORK_ACCESS_DENIED`). После разрешённого запуска на том же исходнике проверки прошли. Python alias оказался недоступен; правки применены Node-инструментом, затем все тесты повторены. Для P4-Q материализован неизменённый `release/` из sparse checkout; иначе локальный checkout не содержит receipt, в отличие от полного GitHub Actions checkout. Первичные ошибки сборщика evidence (отсутствующий sparse path и quoted Cyrillic git path) исправлены до фиксации; используются исходные bytes и `git -z`. Эти ошибки инструмента не скрываются как успешные проверки продукта.

## P4-Q отдельно

Проверка прежнего выпуска самой платформы Nexus запускается на `courses/**`. В PR #63 это вызывает исторический release admission на новом курсе. GitHub log подтверждает отказ `P4-Q release branch`; локально воспроизведён тот же отказ без подмены переменных ветки. На входном HEAD дополнительно **107 путей сверх 668** путей исторического receipt; пропущенных исторических путей нет. Переименование ветки или расширение allowlist не сделало бы changeset допустимым. После разбора владелец прямо поручил отделить обычное наполнение. Реализация, ограничения доступа и evidence: [P4Q_GATE_REVIEW_RU.md](P4Q_GATE_REVIEW_RU.md).

## Оставшиеся риски и gates

| Приоритет | Остаток | Ответственная линия |
| --- | --- | --- |
| Высокий | Routing реализован в кандидате; final CI и независимый review нужны перед принятием. Release admission прежний. Branch protection/required checks не прочитаны: API 403; пустой rulesets list не доказывает их отсутствие. | 00/05 |
| Высокий | Полные EULA/условия учебной платформы и EDT не закрыты; публичный training build 8.3.27.1508 NOT RUN. Прежний запуск другой сборки не заменяет эти gates. | 00/03/05, runtime — 02 |
| Высокий | Academy/account-private/Project Studio/PWA adapter не реализован и требует согласования contracts. Локальный самоотчёт не является защищённой аттестацией. | 02/01/07 |
| Средний | Физические Android/iPhone/Safari/WebKit, accessibility с assistive technology и field p95 NOT RUN. | 07/05 |
| Средний | Независимая предметная/педагогическая экспертиза и измеренный образовательный эффект отсутствуют. Curricula P2–P12/A2–A8 остаются планом. | 03/06 |
| Средний | Exclusive-rights review материалов и авторство обучающегося не доказаны; ссылки и Git provenance не подменяют эти проверки. | 03/05 |

## Routing и следующий шаг

**STATUS: PARTIAL. WHAT WAS PROVED:** два замечания устранены, прежние IDs/сохранения и границы evidence сохранены; Content/RU-EN/regression/browser/offline проверки прошли. **WHAT REMAINS:** CI нового commit и перечисленные gates полного продукта. Итог CI фиксируется в PR metadata после публикации коммита, без переименования FAIL в PASS.

**ROUTING CHECK:** 00/05 — review реализованного content routing по прямому решению владельца; 02/01/07 — integration contracts; 04 — материал для ВКР. Есть ли материал для диплома? Да: membership и revision history без миграции/очистки, границы нативного доказательства, воспроизводимость отказа release admission. Измеренный эффект на обучение не утверждается.

**NEXT RECOMMENDED BRANCH: 05 совместно с 03. RECOMMENDED MODE:** Высокий; licensing/runtime/security — Очень высокий. A2/P2 не начинать параллельно. Main/production/merge/Release не выполнять.
