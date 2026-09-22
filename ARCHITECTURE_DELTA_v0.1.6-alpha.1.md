# Architecture Delta — v0.1.6-alpha.1

## Nexus Code Studio Foundation

This release adds an IDE layer above the already proven Polyglot Runtime architecture.

### Added
- `sandbox/code-studio.js`: language-neutral editor controller with C++ syntax highlighting, bracket matching, auto-indent, find, undo/redo, cursor position and diagnostics navigation.
- `sandbox/code-workspace.js`: virtual workspace model designed for future multi-file language projects.
- Problems panel joining static diagnostics, compiler diagnostics and provider-limit messages without conflating their meaning.
- Click-to-jump `line:column` diagnostics.

### Preserved
- Runtime Router and Provider Contract.
- Clang/WASI Modern C++ provider from v0.1.5-alpha.2.2.
- 40 C++ stable IDs and legacy 0…39 indices.
- Legacy progress key and migration.
- Nexus Lesson Standard 1.0 Normative / Production.
- Benchmark lesson bodies.

### Boundary
The UI remains single-file in alpha.1. The underlying workspace model is multi-file capable by design; multi-file compile/build is a later release.
