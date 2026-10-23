# ADR-0021 — CP-1.1 Content Package Contract поверх существующего courses/

**Статус:** Proposed / implementation candidate.

## Context

На Alpha10.3.1 уже существуют рабочие `courses/cpp`, Academy, Code Studio, Project Studio, стабильный local progress и Offline-First. Нужен единый Content Foundation без миграции рабочего курса и без преждевременного Skill Graph.

## Decision

1. `courses/` остаётся canonical production root для course packages.
2. `content/schemas/` хранит общие versioned schemas.
3. Курс добавляет `content-package.json` как contract index, не копируя учебные payloads.
4. Общая schema course-generic: тип активности — stable `activityType`, а C++ invariants находятся в semantic validator.
5. Stable IDs обязательны для Course/Module/Topic/Skill/Exercise/Practice/Project.
6. Skill identities берутся только из уже существующих явно объявленных benchmark mappings; правило `Topic = Skill` запрещено.
7. Неполный mapping фиксируется явно как `pending-cp3`.
8. Skill Graph edges, Learning Events и Mastery остаются `not-implemented`.
9. CP-1.1 не подключается к runtime до отдельного integration milestone.

## Alternatives

### Миграция courses/ → content/courses/

Отклонена: риск progress/offline/runtime regression и второй источник истины.

### Один synthetic Skill на Topic

Отклонено после self-review: тема может обучать нескольким навыкам, а benchmark content уже это доказывает.

### Немедленное заполнение полного Skill Graph

Отклонено: это scope CP-3; без методического mapping это создало бы ложные данные для будущей ML-оценки.

### C++-specific JSON Schema

Отклонено после первого automated PASS: schema обязана валидировать будущие графические/симуляционные курсы; C++-специфичные правила вынесены в semantic validator.

## Compatibility / rollback

Изменения additive-only. Existing runtime files не изменяются. Rollback — удалить новые CP-1.1 files/branch; пользовательский прогресс и production runtime не затрагиваются.

## Security / Cloud impact

Нет изменений Identity, OAuth, sessions, Cloud Sync, Worker/D1 или credential flows.


## Schema / semantic validator boundary

JSON Schema определяет переносимый формат и поэтому не содержит C++ route, legacy storage key или фиксированный `code.*` activity type. Milestone-specific ограничения Alpha10.3.1 проверяет semantic validator. Это позволяет развивать тот же формат для графики, симуляций и последующих Skill/Learning слоёв без ослабления CP-1.1 gate.
