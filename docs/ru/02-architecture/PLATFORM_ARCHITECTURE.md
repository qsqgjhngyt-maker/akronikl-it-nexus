> **Основной язык документации: русский.** Русская версия является нормативной. Английская версия поддерживается как вторичное зеркало для международных пользователей.

# Целевая архитектура платформы

```text
Akronikl IT Nexus
├── core/                  # маршрутизация, progress, storage, assessments, PWA
├── ui/                    # библиотека, course home, lesson shell, shared components
├── akronikl/              # assistant client, context builder, UI, animations
├── runners/               # адаптеры JSCPP / remote sandbox / data notebooks
├── skill-graph/           # skills, prerequisites, mastery aggregation
├── courses/
│   ├── cpp/
│   ├── algorithms/
│   ├── os/
│   └── ...
├── practices/
├── assets/
├── docs/
└── tests/
```

## Главный принцип
Course package не должен знать детали DOM всей платформы. Он предоставляет manifest, curriculum, lessons, labs, projects, skills и локализованные строки через контракт.

## Миграция из текущего v7
Текущий `index.html` остаётся reference baseline. Разделение выполняется поэтапно и только с регрессией поведения: сначала данные, затем render-модули, затем platform core.
