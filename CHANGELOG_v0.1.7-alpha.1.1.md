# CHANGELOG v0.1.7-alpha.1.1

- Fixed a boot-blocking failure mode introduced by Project Studio static module imports.
- Project Studio modules are now lazy-loaded only when the user opens Project Studio.
- Platform Shell, Academy, C++ course, Code Studio and other existing routes can boot even if a Project Studio file is temporarily missing during GitHub Pages propagation.
- Added visible boot diagnostics for module/resource errors, unhandled rejections and a 12-second startup watchdog.
- Added route-level recovery screen for Project Studio module-load failures.
- Existing Project Studio foundation, Clang/WASM runtime, course content, stable IDs and progress storage are unchanged.
