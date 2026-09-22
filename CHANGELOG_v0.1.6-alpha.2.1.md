# CHANGELOG v0.1.6-alpha.2.1

- Fixed active-file deletion corruption: stale deleted-file content is no longer synchronized into the entry file.
- Added safe fallback-file loading after deleting the active file.
- Added persisted Code Studio view state for active file, caret/selection, editor scrollTop and scrollLeft.
- Added route-scoped page scroll resume after reload for long lessons.
- Added regression coverage for persistence/resume behavior and Service Worker precache.
- Multi-file Clang/WASM runtime behavior and course content are unchanged.
