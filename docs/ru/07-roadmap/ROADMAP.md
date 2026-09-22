> **Основной язык документации: русский.** Русская версия является нормативной. Английская версия поддерживается как вторичное зеркало для международных пользователей.

# Roadmap — от C++ v7 к Akronikl IT Nexus

## Этап 0 — Foundation v0.1
- baseline и backup;
- двуязычная документация;
- требования и ADR;
- целевая архитектура.

## Этап 1 — C++ Reference Course
- вынести content model из monolith;
- создать 3 эталонных урока: структура программы, указатели/память, ООП;
- утвердить Full Theory Standard;
- сохранить текущий progress через migration.

## Этап 2 — Akronikl Shell
- визуальный персонаж и состояния;
- context builder;
- offline mentor fallback;
- secure AI gateway prototype без client-side key.

## Этап 3 — C++ Complete
- мигрировать 40 глав;
- расширить 6 практикумов и 7 проектов;
- code/example audit;
- mobile/PWA QA.

## Этап 4 — Nexus Core
- библиотека курсов;
- course package loader;
- Skill Graph;
- prerequisites;
- общий progress/dashboard.

## Этап 5 — фундаментальные дисциплины
Программирование → ООП → Алгоритмы и структуры данных → Низкоуровневое программирование → ОС → Базы данных → Сети.

## Этап 6 — Data/AI/Cloud/Security
По мере готовности prerequisite graph и лабораторной инфраструктуры.

## Этап 7 — Практики и портфолио
Три технологические практики, производственные/эксплуатационные практики и capstone.

## Nexus Project Studio — старт реализации
`v0.1.7-alpha.1` переводит Project Studio из roadmap в рабочий Foundation: project entity, manifest, persistent workspace, nested paths, milestones, checkpoints и reuse единого Code Studio/Runtime Router. C++ практикумы и проекты связаны с живыми Studio-средами.

Следующие слои: Nexus Sync (смартфон ↔ ПК, offline queue, conflicts), Project Export & Release (source ZIP / release snapshot), Nexus Tests и Secure Build для native/Docker artifacts.
