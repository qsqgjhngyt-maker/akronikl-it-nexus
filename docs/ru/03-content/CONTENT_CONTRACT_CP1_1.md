# CP-1.1 — единый контракт образовательного контента Nexus

**Статус:** implementation candidate в ветке `feature/cp-1.1-content-contract-foundation`.  
**Базовый main:** `0f71bb9f8752a34040ccb007acb2efcb89d8e36a` (Alpha10.3.1).

## Решение

CP-1.1 вводит единый versioned Content Package Contract поверх существующего production-root `courses/`.

Выбрана additive-only схема:

```text
courses/
  cpp/
    manifest.json
    curriculum.json
    data/...
    content-package.json   ← новый contract index

content/
  schemas/
    content-package-v1.schema.json
```

Учебные тексты, практикумы и проекты не копируются в `content/`. Это исключает появление двух источников истины.

## Модель данных

```text
Course
 └─ Module
     └─ Topic
         ├─ Skill
         └─ Exercise
Course/Module
 ├─ Practice
 └─ Project
```

Для C++ CP-1.1 создаёт:

- 6 Module;
- 40 Topic;
- 40 foundation Skill;
- 40 Exercise mappings;
- 6 Practice mappings;
- 7 Project mappings.

Стабильные production C++ IDs остаются неизменными. Новые skill/exercise IDs детерминированы и versioned contract-ом.

## Почему не переносим C++ в новый каталог

Рассматривалась альтернатива `content/courses/cpp`. Она отклонена, потому что привела бы к двум canonical деревьям рядом с уже работающим `courses/cpp`, усложнила бы Offline-First, прогресс и Academy routing.

## Runtime boundary

CP-1.1 специально **не подключает** `content-package.json` к `core/course-registry.js`.

Причина: сначала нужен формальный контракт и доказанная совместимость. Runtime integration — отдельный bounded milestone после MASTER review.

## Progress / Offline

Сохраняются:

- `akronikl:it-nexus:state:v1`;
- `courses.cpp.lessons[lessonId]`;
- `courses.cpp.practicums[practicumId]`;
- legacy `cpp_programming_pdf_course_v1`;
- current PWA/service-worker generation.

Новые contract-файлы не участвуют в offline runtime в CP-1.1, поэтому текущий verified offline graph не меняется.

## Будущие слои

Контракт резервирует границы для:

- Skill Graph;
- Learning Events;
- Mastery Model.

Их статус в эталонном C++ package прямо фиксируется как `not-implemented`. CP-1.1 не создаёт граф prerequisite edges, не пишет учебные события и не пересчитывает mastery.

Для будущей ВКР важна стабильная identity chain:

```text
courseId → moduleId → topicId → skillId → exerciseId/practiceId/projectId
```

Она позволит позднее связывать учебные события с навыками без переименования существующего C++ content.

## Проверка

Основной gate:

```bash
node tools/validate-content.mjs
node --test tests/content-contract.test.mjs
```

Дополнительно CI запускает C++ benchmark, Lesson Standard, Academy/programming catalog, shared learning views, Code/Project Studio и Offline/PWA regressions.
