# Nexus Code Studio Architecture

**Status:** Multi-file / v0.1.6-alpha.2  
**Runtime baseline:** v0.1.5-alpha.2.2 LIVE PASS  
**Single-file Code Studio baseline:** v0.1.6-alpha.1 LIVE PASS

## Purpose

Nexus Code Studio is the IDE layer above the unified Nexus Sandbox. The Runtime Router remains language-neutral while the workspace is now a real multi-file UI and build model rather than only a foundation API.

## Invariants

1. Learner source remains the source of truth and is never silently rewritten.
2. The same Code Studio supports both one-file lessons and projects.
3. Browser Runtime remains the fast one-file provider; multi-file work routes to WASM/extended providers.
4. Headers are VFS inputs while `.cpp/.cc/.cxx` files are compilation units.
5. Diagnostics retain `file:line:column` and open the correct file.
6. Workspace snapshots are stored in lesson state without changing the legacy progress key.

## Multi-file build

Runtime requests carry `source`, `entryFile` and `files`. Browser Runtime declares multi-file unsupported, Router selects the WASM provider, and the Worker mounts every workspace file in the Clang virtual filesystem. All C/C++ translation units are compiled and linked into one `program.wasm`; headers are resolved through normal quoted includes.

## Diagnostics

A Clang diagnostic such as `Printer.cpp:4:12: error: ...` becomes a file-aware Problem. Clicking it activates `Printer.cpp`, moves the caret to line 4 column 12, and persists the active workspace file.

## Alpha.2 boundary

CMake/custom flags, package management, full folder projects, dedicated test runners and snapshot/version history remain future Project Studio layers.
