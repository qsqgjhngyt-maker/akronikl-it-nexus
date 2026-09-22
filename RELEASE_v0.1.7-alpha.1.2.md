# AKRONIKL IT NEXUS v0.1.7-alpha.1.2

## Production Entry Syntax Hotfix

This hotfix fixes the concrete browser-reported startup failure:

`SyntaxError: Unexpected identifier 'placeholder'` in `core/app.js`.

### Root cause
An automated edit left a duplicated declaration token:

`function placeholderfunction placeholder(v)`

in the final published application entry. Because ES module parsing failed before bootstrap, the Platform Shell could not start.

### Changes
- restore valid `function placeholder(v)` declaration;
- add a dedicated final-entry `node --check` regression test;
- update version/cache-busters to v0.1.7-alpha.1.2.

### Unchanged
- Project Studio Foundation and lazy route loading;
- project schema/checkpoints;
- Code Studio / Multi-file workspace;
- Runtime Router / Clang-WASM-WASI;
- C++ lesson content, stable IDs and progress migration.
