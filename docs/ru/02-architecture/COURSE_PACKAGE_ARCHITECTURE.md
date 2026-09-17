> **Основной язык документации: русский.** Русская версия является нормативной. Английская версия поддерживается как вторичное зеркало для международных пользователей.

# Архитектура пакета курса

Минимальный контракт:

```text
courses/<courseId>/
├── manifest.json
├── curriculum.js|json
├── locales/
│   ├── ru/
│   └── en/
├── lessons/
├── labs/
├── assessments/
├── projects/
├── skill-map.json
└── sources.md
```

`manifest` содержит id, version, title, description, prerequisites, languages, skillIds, entry route, offline policy и compatibility range платформы.

Уроки должны иметь стабильные id; прогресс не привязывается к порядковому номеру массива.
