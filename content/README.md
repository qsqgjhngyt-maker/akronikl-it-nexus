# AKRONIKL IT NEXUS — Content Contract Foundation

CP-1.1 вводит формальный, версионируемый контракт образовательного контента без миграции рабочего C++ runtime.

## Каноническое размещение

- `courses/` остаётся production-root пакетов курсов.
- `content/schemas/` содержит только формальные схемы и общие контракты.
- `courses/cpp/content-package.json` — эталонный C++ contract index. Он не дублирует тексты уроков, задания или проекты: хранит только стабильные идентификаторы, ссылки и правила совместимости.

## Модель v1

`Course → Module → Topic → Skill → Exercise / Practice / Project`

CP-1.1 создаёт foundation-level Skill entities и стабильные связи. Skill Graph, Learning Events и Mastery Model остаются `not-implemented`.

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
