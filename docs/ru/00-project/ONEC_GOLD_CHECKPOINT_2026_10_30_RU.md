# 00 — первый implementation checkpoint двух курсов 1С

**STATUS: PARTIAL.** Реализация кандидата IMPLEMENTED; выполненные тесты имеют AUTOMATED PASS. LIVE/FULL LIVE PASS и готовность полных курсов не заявляются.

База main: `d8721e06a2b1ac953aa18694c07559c62d388700`. Feature: `feature/onec-dual-gold-foundation-20261030`. Точный GitHub candidate SHA/PR и CI фиксируются в итоговом evidence после создания PR; это не разрешение слияния.

**TWO CURRICULA:** P1–P12 (`onec`, 48 тем) и A1–A8 (`1c-enterprise`, 32 темы). У каждого собственные IDs, prerequisites, результаты и аттестация. Вход в P напрямую разрешён. Остальные 72 темы остаются PLANNED.

**SHARED CONTENT CONTRACT:** два CP-1.1 pilot-package, неизменённая generic schema, общий справочник/диаграммы/prerequisites v1. Не реализованы общий Skill Graph, Learning Events и Mastery. Прогресс кандидата локальный, раздельный; active account progress/Cloud Sync не подключены.

**IMPLEMENTED A1 / P1:** 8 оригинальных содержательных уроков, каждый RU/EN; теория, примеры, интерактивная модель и схемы, три уровня практики, лабораторные, типичные ошибки, вопросы/объяснения и проверяемые результаты. Работы проекта копируются с новым ID и provenance; источники и результаты другого курса не перезаписываются и не засчитываются автоматически.

**BSL RUNTIME:** реальная официальная платформа 8.3.27.2214, подпись Valid (LLC 1C-Soft), новая файловая база. Нативный модуль: 3 синтетические записи в памяти, 105 минут, 2 отклонённых статуса. Backup/restore воспроизвёл вывод. Испорченный отдельный модуль обнаружен CheckConfig, exit=101. OneScript/BSL LS/EDT не объявляются интегрированными. Training 8.3.27.1508 ещё не проверена.

**TESTS / EVIDENCE:** 12 новых unit-тестов; 20 групп regression включая CP-1.1/C++/Studio/PWA/Cloud contracts; браузерные размеры 1366/390/375/320, все 16 локализаций, клавиатура/схемы, раздельный progress, reload, копии/XSS escaping/storage failure, cold offline без сети. Safe native/browser/regression отчёты находятся в `docs/ru/03-content/onec/evidence/`; воспроизводимый CI — отдельный workflow, без deployment permissions.

**PERFORMANCE:** основной startup graph прежний: 79 модулей / 629956 source bytes на P4-Q базе; новый контент не добавлен к старту. Автономный HTML порядка 227 KB, точные bytes/hash — в evidence. Локальные readiness измерения не являются field p95 или доказательством отсутствия регрессии на физических устройствах.

**RISKS / WHAT REMAINS:** полные EULA community/EDT/точной training-поставки; независимая предметная экспертиза; training build; физические Android/iPhone/Windows и Safari/WebKit; согласование lazy routes, account-private adapter, Project Studio copying и PWA resources. До этого текущие карточки planned сохраняются. Официальный C++ 1.0 и production не менялись.

**ROUTING CHECK:** 00 → 02/07 для точного integration proposal; 05 для evidence review; 04 для материала ВКР. 01 подключить при изменении private/offline/runtime contracts; 06 — только при отдельной исследовательской задаче. Полные готовые тексты: `docs/ru/03-content/onec/ROUTING_RU.md`.

**NEXT RECOMMENDED BRANCH:** 00 → 02/07 → 03. Сначала приёмка кандидата и согласованный integration step, затем A2/P2.

**RECOMMENDED MODE:** Высокий; Очень высокий для licensing/runtime/security и private/offline integration.
