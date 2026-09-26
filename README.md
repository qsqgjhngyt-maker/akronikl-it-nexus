> **Текущий runtime: v0.1.7-alpha.2.4.3 — Devices & Sessions / Session Migration Foundation.** Account Center теперь показывает реальные серверные устройства/сессии и использует session-first credential resolver с безопасным legacy rollback.

> **Текущий runtime: v0.1.7-alpha.2.4.2 — Identity v2 Session Foundation.** Серверные устройства/сессии и отзыв уже реализованы как foundation; legacy Cloud Sync остаётся совместимым.


> **Текущий runtime: v0.1.7-alpha.2.4.1 — Nexus Account Shell Foundation.** Account state теперь виден в глобальном header/home; полноценная Identity v2 остаётся следующим этапом.
# AKRONIKL IT NEXUS

**Инженерная образовательная IT-платформа**

> **Nexus — узел связей. Горизонт, за которым знания становятся системой.**

Akronikl IT Nexus — модульная образовательная IT-платформа, объединяющая глубокую теорию, интерактивные лаборатории, программирование, проекты, практики, Skill Graph и персонального AI-наставника Akronikl.

## Миссия

**Качественное инженерное образование не должно начинаться с вопроса: «Можешь ли ты за него заплатить?»**

Основной образовательный путь Nexus проектируется бесплатным. Платформа ориентирована прежде всего на русскоязычную аудиторию, но открыта миру: **Russian-first, not Russian-only**.

## Языки

RU и EN — первые полноценные локали. Архитектура изначально рассчитана на добавление других языков без переписывания ядра. Язык интерфейса, курса и текста/голоса Akronikl могут переключаться независимо.

## Статус

**v0.1.7-alpha.2.3 / Architecture & AI Research Baseline.** Закрыт полный цикл WORK01–WORK08: аудит текущего состояния, требования, C4/DFD/API, ER/Data Dictionary, Identity & Security design, AI Research Design, competitive research и diploma evidence. Cloud Sync LIVE PASS из v0.1.7-alpha.2.2.1 сохранён; production Identity v2 и полноценный Nexus AI ещё не внедрены.

**Исторический baseline UI: v0.1.2-alpha.4.1 / Nexus Glass Dropdown Hotfix.** Нативные системные выпадающие списки в верхней панели заменены на собственный Nexus Glass Dropdown, чтобы убрать светлые popup-меню Windows/Chromium и сохранить единый стиль на ПК и мобильных устройствах. Все возможности alpha.4 сохранены.

**v0.1.2-alpha.4 / Benchmark UX & Sandbox Foundation.** Эталонный урок C++ получил скрываемую навигацию, Focus Reading, отдельный «Справочник терминов» с собственным скроллом и кликабельными терминами, футуристический Nexus Glass UI с адаптивными серебряно-золотыми частицами и новый provider-based Nexus Sandbox. Browser Runtime теперь имеет слой совместимости для стандартных форм вроде `std::cout`, живую структурную проверку, требования задания, понятную диагностику и технический вывод вторым уровнем. Архитектура Nexus Project Studio с версиями, build/test и Akronikl Project Mentor зафиксирована на будущее.

## Права и лицензирование

Мы разделяем бесплатный доступ к знаниям и право коммерчески перепродавать сам проект. Сейчас публичная лицензия намеренно **не активирована**, пока не завершён аудит правообладания, сторонних материалов и вкладов. Целевая модель: noncommercial software license для кода, CC BY-NC-SA 4.0 для собственного учебного контента, отдельная защита бренда и собственные лицензии сторонних компонентов.

Подробнее: [`RIGHTS_AND_LICENSING.md`](RIGHTS_AND_LICENSING.md) и [`docs/ru/08-legal`](docs/ru/08-legal).

## Философия

**Nexus — это узел связей, центр, где соединяются направления.**

«Горизонт событий» используется как брендовая метафора точки перехода: за этой границей отдельные знания перестают быть набором тем и становятся инженерной системой.

Подробнее: [`docs/ru/00-product/BRAND_PHILOSOPHY.md`](docs/ru/00-product/BRAND_PHILOSOPHY.md).

## Документация

Основная нормативная документация: [`docs/ru`](docs/ru).  
Английское зеркало: [`docs/en`](docs/en).

Русская ветка является source of truth. Английская поддерживается для международных пользователей.

## Текущий этап

Текущий релиз: [`RELEASE_v0.1.7-alpha.2.3.md`](RELEASE_v0.1.7-alpha.2.3.md). История изменений: [`CHANGELOG_v0.1.7-alpha.2.3.md`](CHANGELOG_v0.1.7-alpha.2.3.md).

## План первой реализации

1. Baseline-regression и rights/provenance audit для C++ v7.
2. Выделение platform core без изменения поведения.
3. Course package `cpp` со стабильными ID.
4. Миграция прогресса.
5. Multilingual locale registry и Akronikl Context Model.
6. Три эталонных урока максимального качества.
7. Только после PASS — масштабирование остальных дисциплин.

## Репозиторий

Официальное имя: `akronikl-it-nexus`  
Namespace: `akronikl:it-nexus:*`


## Текущая разработка

`v0.1.7-alpha.2.3`: **Architecture & AI Research Baseline**. Runtime-функции Cloud Sync/Project Studio сохраняют проверенный baseline предыдущего релиза; текущий релиз закрывает инженерную, архитектурную и исследовательскую базу перед реализацией Identity v2, Cloud Profile, Skill Map и будущего Nexus AI.
