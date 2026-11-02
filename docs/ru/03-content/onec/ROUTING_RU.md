# Маршрутизация единого checkpoint 1С

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03 CONTENT PRODUCTION.

Результат/milestone: 1C-0 + A1/P1 implementation candidate; реальные учебные материалы, официальный BSL, восстановление и browser/offline evidence.

Куда: сначала 00; через него 02/07, затем 05 и 04. 01 — только если будет принят future private/offline/runtime contract. 06 — при исследовании семантической совместимости OneScript или методического эффекта.

Почему: существующие contracts защищены поручением; изолированный кандидат проверен, но его подключение к приватной Академии/PWA ещё не разрешено и не выполнено.

Когда: сейчас, до следующего крупного этапа.

Что передать: feature/PR/SHA, две curricula, 16 локализаций, native 8.3.27.2214, источники и лицензии, tests/evidence, измерения и ограничения.

Готовый текст для вставки в 00:

> 03 подготовила проверяемый кандидат двух траекторий 1С по решению 30.10.2026. P=`onec`, A=`1c-enterprise`; программы P1–P12/A1–A8, 80 уникальных тем. A1/P1: 8 содержательных уроков RU/EN, многоуровневая практика, лабораторные, вопросы, общие схемы и словарь v1. Остальные 72 темы PLANNED. CP-1.1 schema unchanged. Прогресс кандидата раздельный локальный self-report; копии заметок новые, с provenance, без перезаписи или переноса completion. Официальная подписанная платформа 8.3.27.2214 реально исполнила BSL: 3/105/2 PASS; восстановленная база дала тот же результат; отдельный испорченный модуль отклонён CheckConfig=101. Browser/mobile-emulation/cold offline и регрессии приложены. Main/production/Identity/runtime/Project Studio/PWA contracts не менялись. Статус IMPLEMENTED/AUTOMATED PASS кандидата; общая приёмка PARTIAL. Нужно направить 02/07 точное предложение интеграции, 05 — evidence review, 04 — архитектуру и эксперимент. Не объявлять FULL LIVE PASS и не менять карточки на AVAILABLE до приёмки. Полные EULA community/EDT/точной training-поставки, training 8.3.27.1508, физические устройства и независимая предметная рецензия остаются открытыми.

Предложение для 02/07 через 00 (PLANNED, не применено):

> Добавить lazy view для двух allowlisted Course ID `onec`/`1c-enterprise` в основном route dispatcher. JSON и интерактивы загружать только при входе в курс. Предусмотреть account-private progress adapter с раздельными course keys, сохранением прежних попыток и без автоматического зачёта shared prerequisites. Копирование Project Studio — новая работа с provenance и собственными ID; импорт чужой/исходной работы не перезаписывает её. SEC-PWA resources и перенос account-private payload расширять только после 01/07 review. Никакого BSL provider, локального process bridge или удалённого runner этим предложением не добавляется. Routes/capabilities не объявлять AVAILABLE до соответствующих browser/native/offline gates. База и точный diff кандидата указаны в MASTER checkpoint.

Для 05:

> Проверить candidate PR, SHA, safe native evidence, 20 групп регрессий, 12 новых unit-тестов и browser/offline results. Это review без release/merge/deploy. Открытые юридические и LIVE пункты сохранить как PARTIAL, не скрывать.

Для 04:

> Есть материал ВКР: разделение образовательных траекторий при общем versioned content, evidence hierarchy visualization/static/native, negative-control CheckConfig и восстановление, безопасное копирование проекта. Сохранить причины решений/альтернативы/до-после/security/метрики и ограничения из ADR_ONEC_RU.md. Рост знаний, авторство и field p95 не измерены.

Что потом: вернуться в 03, принять согласованный интеграционный этап и продолжить A2/P2. MASTER HANDOFF — scoped update этого milestone, не переписывание исторического handoff и не новый статус всего production.

Дополнение по реальному GitHub checkpoint: PR #63 / source `10f0aab27c3b707a7beba86f0dc24d0e9cc1a526`, новый CI push/PR SUCCESS. Legacy publication CI FAIL на `P4-Q release branch`; нужен 00/05 review нового bounded CI route. Появился параллельный PR #62 с другим предлагаемым P Course ID `onec-programming` вместо `onec`; нужны решение об ID и единый curriculum source of truth. Ничего из #62 не изменялось. Сначала согласовать кандидаты и gates, затем продолжать активную интеграцию.
