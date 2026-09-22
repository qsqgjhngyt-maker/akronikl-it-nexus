# Architecture Delta — v0.1.7-alpha.1

## Nexus Project Studio Foundation

This release promotes Project Studio from roadmap architecture into an executable platform module while preserving the v0.1.6-alpha.2.1 Code Studio/Runtime baseline.

### New platform entities
- `NexusProject` is persisted independently from course progress under `akronikl:it-nexus:projects:v1`.
- Each project owns a manifest, language ID, entry file, nested workspace, project progress, checkpoints, sync metadata, and release metadata.
- Project workspaces reuse the existing language-neutral Code Workspace and Runtime Router.

### Navigation
- Academy → Programming becomes an available hub.
- Programming links learning, Code Studio, Project Studio, and Challenges.
- C++ practicums open a dedicated Code Studio workspace.
- C++ course projects can be promoted into persistent Project Studio instances.
- The global Projects navigation opens the same Project Studio dashboard.

### Project manifest foundation
`manifest` records:
- project ID/title/language;
- `entryFile`;
- `sourceRoots`, `includeRoots`, `testRoots`;
- build profile / language standard / runtime selection;
- sync and release readiness metadata.

### Checkpoints
Named local checkpoints snapshot the project workspace and project progress. Restore replaces the project workspace atomically with the selected checkpoint state.

### Runtime
No new compiler stack is introduced. Project Studio uses the existing Runtime Router and Clang/WASM provider. Multi-file and nested-path project requests stay compatible with the v0.1.6 multi-file Code Studio path.

### Explicit boundaries
- Cloud device-to-device sync is schema-ready but not enabled in v0.1.7-alpha.1.
- Source ZIP / native executable / Docker release workflows are not implemented in this release.
- Nexus Tests is represented by the project `tests/` root and manifest metadata; automated project test orchestration is a later stage.
