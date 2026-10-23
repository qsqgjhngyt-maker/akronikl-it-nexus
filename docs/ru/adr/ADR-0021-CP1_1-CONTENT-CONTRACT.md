# ADR-0021 — CP-1.1 Content Package Contract поверх существующего courses/

**Статус:** Proposed / implementation candidate.

## Context

На Alpha10.3.1 уже существует рабочий `courses/cpp`, стабильный прогресс, Academy, Code Studio, Project Studio и Offline-First. Старый план отдельного `content/courses` создавал риск двух источников истины.

## Decision

1. `courses/` остаётся canonical production root для course packages.
2. `content/schemas/` хранит формальные versioned schemas.
3. Каждый курс может добавить `content-package.json` как contract index.
4. CP-1.1 не изменяет runtime consumption.
5. Stable IDs обязательны.
6. Skill Graph / Learning Events / Mastery не считаются реализованными.

## Alternatives

### Полная миграция courses/ → content/courses/

Отклонена: риск progress/offline/runtime regression и ненужная миграция рабочего C++.

### Дублирование данных

Отклонено: создаёт две версии истины.

### Немедленное подключение contract к runtime

Отложено: сначала schema/validator/regression evidence.

## Consequences

Плюсы: additive-only, стабильные IDs, машинная валидация, безопасная подготовка Skill/Learning layers.

Минус: до отдельного integration milestone contract index остаётся metadata-only.

## Security / Cloud impact

Нет изменений Identity, OAuth, Cloud Sync, Worker/D1 и credential flows.
