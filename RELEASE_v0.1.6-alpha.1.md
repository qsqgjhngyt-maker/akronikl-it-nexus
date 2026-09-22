# AKRONIKL IT NEXUS v0.1.6-alpha.1

**Release:** Nexus Code Studio Foundation  
**Date:** 2026-09-22

## Goal

Turn the existing Nexus Sandbox into the foundation of a real embedded learning IDE without changing the proven runtime architecture.

## Delivered

- syntax-highlighted source editor;
- synchronized line numbers;
- bracket matching;
- smart Enter auto-indent and Tab/Shift+Tab indentation;
- Ctrl/Cmd+F search with next/previous navigation;
- undo/redo controls and keyboard shortcuts;
- cursor line/column status;
- Problems panel;
- click-to-jump compiler diagnostics;
- language-neutral virtual workspace foundation.

## Runtime

No compiler/provider replacement is performed in this release. Modern C++ keeps using the v0.1.5-alpha.2.2 Clang/LLVM + WASI Worker path.

## Acceptance

The Modern C++ acceptance program using `std::string`, `std::vector`, `std::unique_ptr` and virtual dispatch must still produce `Printer` with exit code 0. A deliberate Clang syntax error must appear in Problems and jump to the reported line/column.

## Not yet in this release

- multi-file UI;
- multi-file compile/link request;
- project tree;
- test runner panel;
- snapshots/history UI;
- exception-enabled C++ provider.
