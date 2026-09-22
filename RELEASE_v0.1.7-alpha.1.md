# AKRONIKL IT NEXUS v0.1.7-alpha.1

**Release name:** Nexus Project Studio Foundation

## Purpose
Turn the existing multi-file Code Studio into the foundation of a real project workflow without forking the editor or runtime architecture.

## Included
- Programming hub in Academy;
- persistent Project Studio dashboard;
- local project entity and manifest;
- nested `src/`, `include/`, `tests/` workspace paths;
- Clang/WASM project build through the existing Runtime Router;
- C++ practicum → Code Studio integration;
- C++ course project → Project Studio integration;
- milestone progress;
- named checkpoints and checkpoint restore;
- local-first sync/release metadata for future stages.

## Not included yet
- cloud/device sync;
- conflict resolution;
- project source ZIP/export;
- native `.exe`/Linux/Docker build artifacts;
- automatic Nexus Tests orchestration.

These are intentionally layered on top of the project model in later releases.

## Regression baseline
The v0.1.6-alpha.2.1 LIVE PASS behavior remains required: Modern C++ Clang/WASM, multi-file compilation, file-aware diagnostics, workspace CRUD persistence, stdin, search, undo/redo, and reload resume.
