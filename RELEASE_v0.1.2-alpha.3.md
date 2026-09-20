# AKRONIKL IT NEXUS v0.1.2-alpha.3

## Benchmark UX & Universal Sandbox Foundation

Эта версия развивает рабочий v0.1.2-alpha.2 без изменения 40 stable lesson IDs и legacy progress bridge.

### Что реализовано
- скрываемая/разворачиваемая левая панель на ПК и overlay drawer на мобильных;
- Focus Reading Mode;
- «Справочник терминов» как независимый right drawer со своим scroll, поиском и кликабельными терминами в benchmark-тексте;
- Nexus Glass: glass-панели, объёмные световые слои, серебряно-золотая particle field и профили FX Auto/Ultra/High/Balanced/Lite/Off;
- provider-based Nexus Sandbox: Browser Runtime активен, WASM и Secure Cloud/Build providers зафиксированы интерфейсами;
- browser compatibility adapter для `std::cout`, `std::cin`, `std::cerr`, `std::endl`, `std::string` и нескольких базовых manipulators;
- line gutter, live structural check, requirements check, human-readable diagnostics и раскрываемый raw runtime output;
- Project Studio architecture: собственные capstone-проекты, версии/snapshots, build/test, Akronikl Project Mentor и Portfolio Release.

### Ограничения alpha
Browser Runtime остаётся учебным runtime и не заменяет полноценный native C++ toolchain для всех возможностей языка. Цель архитектуры — не заставлять ученика менять интерфейс: сложные задачи позднее будут маршрутизироваться в WASM/Secure Build provider.

### Regression boundary
- lesson IDs: unchanged;
- legacy indices: unchanged;
- C++ lesson count: 40;
- practicums: 6;
- projects: 7;
- RU/EN benchmark stable ID: unchanged.
