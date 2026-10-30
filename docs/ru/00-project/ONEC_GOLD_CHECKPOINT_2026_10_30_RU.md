# 00 — два курса 1С: согласованный кандидат

Актуализация 31.10.2026: review 03/05, исправлены membership и инструкция A1.3 RU/EN, пакеты 0.2.1-review. По прямому решению владельца ordinary content отделён от historical publication; receipts/allowlist/старые команды сохранены. 25 локальных regression groups, 13 browser groups, 50 unit checks; GitHub CI нового HEAD фиксируется в PR #63. Продукт PARTIAL/NOT PUBLISHED, main/production/merge не выполнялись. Подробности: REVIEW_0305_RU.md и P4Q_GATE_REVIEW_RU.md в docs/ru/03-content/onec. Ниже сохранена хронология.

Актуальное решение MASTER 00 от 30.10.2026: основным остаётся PR #63; единые ID `onec`/`1c-enterprise`. Консолидация #62 выполнена одним исполнителем в той же feature, source SHA `ff18e15cab5dd9340302976720ad70060249ac05`; после проверок #62 закрыт как superseded с сохранением исходной ветки/архива. Канонический curriculum: 84 темы, все 80 прежних ID сохранены, 4 добавления PLANNED; первые 8 уроков RU/EN дополнены выборочно. Итоговый CI/evidence/closure receipt: `docs/ru/03-content/onec/CONSOLIDATION_RECEIPT_RU.md`. Карта 95 исходных тем: `CONSOLIDATION_RU.md`. Новый native report содержит также 5 вызовов исходной ServiceCost-функции до/после restore. Исторический P4-Q gate не меняется. Общая production/LIVE приёмка остаётся PARTIAL; A2/P2 независимо не разрабатываются.

## Историческая исходная фиксация до консолидации

**STATUS: PARTIAL.** Реализация кандидата IMPLEMENTED; выполненные тесты имеют AUTOMATED PASS. LIVE/FULL LIVE PASS и готовность полных курсов не заявляются.

База main: `d8721e06a2b1ac953aa18694c07559c62d388700`. Feature: `feature/onec-dual-gold-foundation-20261030`. [Draft PR #63](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/63), проверенный source SHA `10f0aab27c3b707a7beba86f0dc24d0e9cc1a526`. Это не разрешение слияния.

**TWO CURRICULA:** P1–P12 (`onec`, 48 тем) и A1–A8 (`1c-enterprise`, 32 темы). У каждого собственные IDs, prerequisites, результаты и аттестация. Вход в P напрямую разрешён. Остальные 72 темы остаются PLANNED.

**SHARED CONTENT CONTRACT:** два CP-1.1 pilot-package, неизменённая generic schema, общий справочник/диаграммы/prerequisites v1. Не реализованы общий Skill Graph, Learning Events и Mastery. Прогресс кандидата локальный, раздельный; active account progress/Cloud Sync не подключены.

**IMPLEMENTED A1 / P1:** 8 оригинальных содержательных уроков, каждый RU/EN; теория, примеры, интерактивная модель и схемы, три уровня практики, лабораторные, типичные ошибки, вопросы/объяснения и проверяемые результаты. Работы проекта копируются с новым ID и provenance; источники и результаты другого курса не перезаписываются и не засчитываются автоматически.

**BSL RUNTIME:** реальная официальная платформа 8.3.27.2214, подпись Valid (LLC 1C-Soft), новая файловая база. Нативный модуль: 3 синтетические записи в памяти, 105 минут, 2 отклонённых статуса. Backup/restore воспроизвёл вывод. Испорченный отдельный модуль обнаружен CheckConfig, exit=101. OneScript/BSL LS/EDT не объявляются интегрированными. Training 8.3.27.1508 ещё не проверена.

**TESTS / EVIDENCE:** 12 новых unit-тестов; 20 групп regression включая CP-1.1/C++/Studio/PWA/Cloud contracts; браузерные размеры 1366/390/375/320, все 16 локализаций, клавиатура/схемы, раздельный progress, reload, копии/XSS escaping/storage failure, cold offline без сети. Safe native/browser/regression отчёты находятся в `docs/ru/03-content/onec/evidence/`; воспроизводимый CI — отдельный workflow, без deployment permissions.

**PERFORMANCE:** основной startup graph прежний: 79 модулей / 629956 source bytes на P4-Q базе; новый контент не добавлен к старту. Автономный HTML порядка 227 KB, точные bytes/hash — в evidence. Локальные readiness измерения не являются field p95 или доказательством отсутствия регрессии на физических устройствах.

**RISKS / WHAT REMAINS:** полные EULA community/EDT/точной training-поставки; независимая предметная экспертиза; training build; физические Android/iPhone/Windows и Safari/WebKit; согласование lazy routes, account-private adapter, Project Studio copying и PWA resources. До этого текущие карточки planned сохраняются. Официальный C++ 1.0 и production не менялись.

**ROUTING CHECK:** 00 → 02/07 для точного integration proposal; 05 для evidence review; 04 для материала ВКР. 01 подключить при изменении private/offline/runtime contracts; 06 — только при отдельной исследовательской задаче. Полные готовые тексты: `docs/ru/03-content/onec/ROUTING_RU.md`.

**GITHUB CI:** новый 1С workflow SUCCESS на push `41085874227` и PR `41085917304`. Общий PR не зелёный: legacy workflow `41085916096` отклоняет новую ветку по `P4-Q release branch`. Его release scope не изменялся. Кроме того, появился параллельный PR #62 с P Course ID `onec-programming`; здесь предложен `onec`. До активной интеграции 00 должен согласовать единый ID и source of truth двух curriculum-кандидатов. Подробности: `docs/ru/03-content/onec/GITHUB_CHECKPOINT_RU.md`.

**NEXT RECOMMENDED BRANCH:** 00 → 02/07 → 03. Сначала приёмка кандидата и согласованный integration step, затем A2/P2.

**RECOMMENDED MODE:** Высокий; Очень высокий для licensing/runtime/security и private/offline integration.
