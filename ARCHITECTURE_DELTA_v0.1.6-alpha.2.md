# Architecture Delta — v0.1.6-alpha.2

## Multi-file Code Studio

This release promotes the Code Workspace model from foundation-only to a real multi-file UI and build path.

### Added
- file tree and file tabs inside Nexus Code Studio;
- add / rename / delete for non-entry workspace files;
- per-file editor state and undo/redo history;
- persistent workspace snapshots in lesson state;
- built-in four-file C++ acceptance project (`main.cpp`, `Device.h`, `Printer.h`, `Printer.cpp`);
- runtime requests carrying `files` + `entryFile`;
- Runtime Router forces multi-file C++ to the WASM provider;
- Clang receives every C/C++ translation unit and links them into one `program.wasm`;
- compiler diagnostics retain filename + line + column;
- Problems can open the diagnostic file and move the caret to the exact position.

### Preserved
- single-file lessons remain valid and need no migration;
- Browser Runtime stays the fast path for compatible one-file C++;
- Modern C++ Clang/WASI baseline remains pinned and exception-disabled as in v0.1.5-alpha.2.2;
- 40 C++ stable IDs, legacy indices and progress key remain unchanged;
- benchmark lesson bodies remain unchanged;
- Nexus Lesson Standard 1.0 remains Normative / Production.

### Boundary
This is a basic translation-unit build graph. Custom compiler flags, folders-as-projects, CMake, package managers, test runners and version history remain Project Studio work.
