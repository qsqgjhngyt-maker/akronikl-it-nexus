# Architecture Delta v0.1.6-alpha.2.1

## Scope

Persistence hardening only. No runtime/provider architecture change.

## Workspace deletion invariant

When the active non-entry file is removed, its editor buffer is synchronized while it is still active, then the workspace removes it and selects the entry fallback. The fallback file is loaded with `syncCurrent:false`, preventing stale deleted-file text from being written into the new active file.

## Resume state

Code Studio persists per-file view state (`selectionStart`, `selectionEnd`, `scrollTop`, `scrollLeft`) alongside the existing workspace snapshot. Page scroll position is stored independently in sessionStorage under a hash-route key, avoiding content-state pollution while surviving reloads in the current tab.

## Compatibility

Multi-file Clang/WASM builds, Runtime Router/provider contracts, course content, stable IDs, legacy indices and progress migration are unchanged.
