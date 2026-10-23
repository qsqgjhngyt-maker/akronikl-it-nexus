# CP-1.1 — единый контракт образовательного контента Nexus

**Статус:** implementation candidate в ветке `feature/cp-1.1-content-contract-foundation`.  
**Базовый main:** `0f71bb9f8752a34040ccb007acb2efcb89d8e36a` (Alpha10.3.1).

## Решение

CP-1.1 вводит единый versioned Content Package Contract поверх существующего production-root `courses/`.

```text
courses/
  cpp/
    manifest.json
    curriculum.json
    data/...
    content-package.json

content/
  schemas/
    content-package-v1.schema.json
```

Учебные тексты, практикумы и проекты не копируются в `content/`. Это исключает два источника истины.

## Универсальная модель

```text
Course
 └─ Module
     └─ Topic
         ├─ Skill reference
         └─ Exercise
Course / Module
 ├─ Practice
 └─ Project
```

Каждая Activity имеет стабильный ID, `scope`, ссылки на module/topic/skill, `activityType`, locale и source mapping. Общая schema не фиксирует C++-типы и допускает будущие graphics/simulation/data activities.

## C++ reference mapping

Contract фиксирует:

- 6 Module;
- 40 Topic;
- 40 Exercise;
- 6 Practice;
- 7 Project;
- 15 canonical foundation Skill references из трёх уже утверждённых benchmark-уроков.

У 37 остальных тем skill mapping честно помечен `pending-cp3`. Это намеренно: CP-1.1 не должен превращать Topic в Skill и тем самым предрешать будущий Skill Graph.

### Legacy skill alias

В исходном benchmark content обнаружены два написания одной концепции:

- `cpp.const-correctness`;
- `cpp.const.correctness`.

Content adapter нормализует первое в `cpp.const.correctness`; исходные lesson payloads не меняются. Canonical stable ID: `skill.cpp.const.correctness`. В `sourceCodes` сохраняются оба исходных значения для traceability.

## Versioning

Разделены:

- `schemaVersion` — версия структуры JSON;
- `contractVersion` — версия CP contract;
- `contentVersion` — версия course package из C++ manifest;
- application/release version — вне Content Package.

## Почему не переносим C++ в content/courses

Полная миграция отклонена: она дала бы риск regressions для Academy, progress и Offline-First. `courses/` остаётся production root, `content/` — shared schemas/contracts.

## Runtime boundary

CP-1.1 специально не подключает `content-package.json` к `core/course-registry.js`. Runtime integration — следующий отдельный bounded milestone после доказательства contract stability.

## Progress / Offline

Не меняются:

- `akronikl:it-nexus:state:v1`;
- `courses.cpp.lessons[lessonId]`;
- `courses.cpp.practicums[practicumId]`;
- `cpp_programming_pdf_course_v1`;
- Project DB key;
- current PWA/service-worker generation.

## Будущая ВКР / Learning Events

CP-1.1 создаёт стабильные join keys:

```text
courseId → moduleId → topicId → skillId? → exerciseId / practiceId / projectId
```

Знак `?` принципиален: skill mapping может быть `pending-cp3` и не подделывается ради полноты.

Будущий Learning Event сможет ссылаться на эти identifiers без хранения полного текста урока или исходного кода в event payload. Skill Graph edges, event collection и Mastery Model в CP-1.1 имеют статус `not-implemented`.

## Validation gates

```bash
node tools/validate-content.mjs
node --test tests/content-contract.test.mjs
```

Semantic validator дополнительно проверяет production C++ IDs, legacy indexes, broken refs, orphan skills, progress/localStorage keys, Academy route и отсутствие runtime consumption CP-1.1.
