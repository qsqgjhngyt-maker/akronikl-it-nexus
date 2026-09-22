# Architecture Delta — v0.1.7-alpha.1.2

## Production entry syntax gate
The published `core/app.js` is now validated as a final production entry after all release-time edits. This closes a gap where an automated patch could create a syntactic defect after individual source/module checks had already passed.

## Hotfix
- fixed duplicated `function placeholderfunction placeholder(v)` token;
- restored valid `function placeholder(v)` entry;
- added `tests/production-entry-syntax-check.mjs`;
- bumped cache-busters and Service Worker cache namespace.

## Compatibility
Project Studio schema, lazy loading, Code Studio, Runtime Router, Clang/WASM/WASI, course content, progress and workspace persistence remain unchanged.
