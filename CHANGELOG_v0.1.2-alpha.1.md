# Changelog v0.1.2-alpha.1

## Added
- Первый полный benchmark-урок Nexus: `cpp.first-cpp-program`.
- Полная RU/EN локализация benchmark-урока с единым stable ID прогресса.
- `courses/cpp/data/lessons.en.json` как partial localization package.
- Полная теория, toolchain pipeline, line-by-line walkthrough, experiments, error cases, lab, Skill Graph и deep knowledge check.
- Адаптивные benchmark-компоненты для desktop/mobile.

## Changed
- Современный эталон первой программы использует `std::cout` и `\n`.
- `course-registry.js` загружает частичный EN content package.
- При English course locale только авторизованные EN-уроки заменяют RU baseline; остальные честно fallback-ятся.
- C++ manifest и root version metadata обновлены до v0.1.2-alpha.1.
- Service Worker cache namespace обновлён.

## Preserved
- 40 stable C++ lesson IDs.
- Legacy C++ v7 progress bridge.
- 6 практикумов, 7 проектов, PDF coverage map.
- Immutable source baseline `cpp-course v7`.
