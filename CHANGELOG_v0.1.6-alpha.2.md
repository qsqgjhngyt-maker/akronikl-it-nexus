# CHANGELOG — v0.1.6-alpha.2

## Added
- Multi-file Code Studio UI with file tree and tabs.
- Create, rename and delete workspace files.
- Per-file Undo/Redo and active-file persistence.
- Four-file C++ demo project for live acceptance testing.
- Multi-file Runtime request contract (`files`, `entryFile`).
- Multi-translation-unit Clang/WASM compile + link.
- File-aware Clang Problems navigation.

## Changed
- Browser Runtime explicitly declines multi-file projects so Runtime Router selects Nexus WASM C++ Runtime.
- Modern C++ provider scores multi-file builds as a preferred WASM capability.
- Static analysis is workspace-aware and no longer requires `main()` inside headers/secondary `.cpp` files.
- Successful build output lists all translation units when more than one is compiled.

## Preserved
- v0.1.6-alpha.1 Code Studio behavior in single-file mode.
- v0.1.5-alpha.2.2 Modern C++ ABI alignment and provider capability boundary for `try/throw/catch`.
- course content, stable IDs and progress migration.
