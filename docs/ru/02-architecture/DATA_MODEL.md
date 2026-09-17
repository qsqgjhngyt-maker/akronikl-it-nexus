> **Основной язык документации: русский.** Русская версия является нормативной. Английская версия поддерживается как вторичное зеркало для международных пользователей.

# Модель данных — черновик v0.1

## Основные сущности
`Course`, `Module`, `Lesson`, `Section`, `Lab`, `Assessment`, `Project`, `Skill`, `PrerequisiteEdge`, `ProgressRecord`, `Attempt`, `AkroniklContext`.

## Пример Lesson
```json
{
  "id": "cpp.pointers.intro",
  "courseId": "cpp",
  "moduleId": "cpp.memory",
  "title": {"ru": "Указатели", "en": "Pointers"},
  "skillIds": ["cpp.memory.addressing"],
  "prerequisites": ["cpp.scope", "cpp.arrays"],
  "sections": ["quick", "deep", "fullTheory", "internals", "examples", "practice"],
  "labs": ["cpp.pointers.lab1"]
}
```

## Progress
Прогресс версионируется и мигрируется. Удаление/переименование content id требует migration map.
