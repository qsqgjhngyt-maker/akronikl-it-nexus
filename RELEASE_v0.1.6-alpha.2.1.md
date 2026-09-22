# AKRONIKL IT NEXUS v0.1.6-alpha.2.1

**Release:** Workspace Persistence & Resume Hotfix  
**Date:** 2026-09-22

## What changed

- Fixed a live-found multi-file CRUD defect where deleting the active temporary file could copy its editor contents into `main.cpp`.
- Active-file deletion now loads the fallback file without re-synchronizing the deleted buffer.
- Code Studio now persists active file, caret/selection and per-file editor scroll positions.
- Long lesson pages restore the previous page scroll position after reload in the same browser tab.

## Unchanged baseline

- Real multi-translation-unit Clang/WASM builds.
- File-aware Problems navigation.
- Browser Runtime / WASM Runtime routing.
- Course lesson bodies, stable IDs, legacy 0…39 indices and progress migration.

## Live acceptance

1. Restore the 4-file demo workspace.
2. Create `Temp.cpp`, type `123`, reload: file/content must persist.
3. Rename it to `Utils.cpp`, reload: renamed file/content must persist.
4. Delete `Utils.cpp` while it is active, reload: it must stay deleted and `main.cpp` must retain its original C++ content.
5. Scroll far down a long lesson and reload: the page must return to the same section.
6. Open `Printer.cpp`, place the caret and scroll inside the editor, reload: active file/caret/editor scroll must be restored.
