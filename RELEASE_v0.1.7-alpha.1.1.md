# AKRONIKL IT NEXUS v0.1.7-alpha.1.1

## Project Studio Boot Recovery Hotfix

This hotfix keeps the v0.1.7-alpha.1 Project Studio Foundation intact while removing it from the critical initial module graph. New Project Studio modules are loaded on demand when the user enters Project Studio.

### Why
A partially propagated/missing new module on GitHub Pages could prevent `core/app.js` from evaluating at all. In that failure mode the previous `bootstrap().catch(...)` was never installed, so the boot screen could remain forever without showing the real error.

### Changes
- lazy dynamic import for Project Studio store/templates/UI;
- initial Platform Shell no longer depends on Project Studio module availability;
- global boot diagnostics in `index.html`;
- 12-second startup watchdog;
- route error recovery with retry/home actions;
- new Service Worker/cache-buster version.

### Unchanged
- Project Studio data schema and local projects;
- Code Studio / Multi-file workspace;
- Runtime Router / Clang-WASM-WASI;
- C++ lesson content, stable IDs and progress migration.
