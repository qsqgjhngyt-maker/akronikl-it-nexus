# AKRONIKL IT NEXUS — Content Contract Foundation

CP-1.1 вводит формальный, версионируемый и расширяемый контракт образовательного контента без миграции рабочего C++ runtime.

## Каноническое размещение

- `courses/` остаётся production-root пакетов курсов.
- `content/schemas/` содержит общие формальные схемы.
- `courses/cpp/content-package.json` — эталонный C++ contract index. Он не дублирует тексты уроков, практикумы или проекты: хранит стабильные идентификаторы, ссылки, scope и правила совместимости.

## Модель v1

`Course → Module → Topic → Skill → Exercise / Practice / Project`

Общая JSON Schema не привязана к C++: `activityType` допускает будущие `graphics.exercise`, `simulation.experiment` и другие стабильные capability identifiers. C++-специфичные invariants проверяет semantic validator.

## Skill boundary

CP-1.1 **не создаёт искусственное правило «одна тема = один навык»**.

- 3 benchmark-темы используют уже существующие `benchmark.skillGraph.strengthens`;
- это даёт 15 canonical foundation skill references;
- 37 остальных C++ тем имеют `skillMappingStatus: pending-cp3`;
- Practice и Project skill mapping также остаётся `pending-cp3`;
- prerequisite edges, Learning Events и Mastery Model не реализуются.

Legacy skill code `cpp.const-correctness` нормализуется adapter-слоем в `cpp.const.correctness` без изменения исходного C++ lesson payload.

## Совместимость

CP-1.1 не изменяет:

- C++ lesson IDs и legacy indexes;
- `akronikl:it-nexus:state:v1`;
- `cpp_programming_pdf_course_v1`;
- Academy route `#course=cpp`;
- Project Studio / Code Studio runtime;
- Offline-First / service worker;
- Identity / Cloud Sync.

Проверки:

```bash
node tools/validate-content.mjs
node --test tests/content-contract.test.mjs
```
