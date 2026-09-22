# Architecture Delta — v0.1.7-alpha.1.3

## Project VFS Path Mapping
- Project Studio keeps nested paths (`src/`, `include/`, `tests/`) 1:1 in the project model.
- The Clang adapter converts the flat Nexus file map into the recursive directory object required by the YoWASP virtual filesystem.
- Production Run receives only production translation units; test translation units are excluded from normal Run builds.
- Project include roots are forwarded to Clang with `-I` arguments.

## Code Studio Auto-Resize Recovery
- Editor height is recalculated in both directions after edits, Undo/Redo, file switches, workspace replacement and checkpoint-driven rerenders.
- Clearing a large source returns the editor to its original compact height.
- Growth is capped; larger files use the editor's internal scroll instead of stretching the whole lesson indefinitely.

## Session-only Resume
- Exact page scroll continues to use `sessionStorage`.
- Per-file caret and editor scroll are now session-scoped too.
- Persistent course/project storage keeps code, files, active file, progress, milestones and checkpoints, but no longer persists transient editor coordinates.
