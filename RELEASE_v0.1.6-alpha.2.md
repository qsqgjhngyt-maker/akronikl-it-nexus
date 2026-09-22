# AKRONIKL IT NEXUS v0.1.6-alpha.2

**Release:** Multi-file Code Studio  
**Baseline:** v0.1.6-alpha.1 LIVE PASS  
**Date:** 2026-09-22

## Goal
Turn the v0.1.6-alpha.1 virtual workspace foundation into a real multi-file C++ editing and build workflow without changing the proven Runtime Router / Clang-WASI architecture.

## Acceptance project

```text
Project
├── main.cpp
├── Device.h
├── Printer.h
└── Printer.cpp
```

Expected successful run:

```text
Printer
Exit code: 0
Provider: Nexus WASM C++ Runtime
Build: main.cpp + Printer.cpp (2 TU)
```

A compile error placed in `Printer.cpp` must appear in Problems as `Printer.cpp:line:column`; clicking it must open `Printer.cpp` and move the caret to that coordinate.

## Runtime behavior
- one-file lightweight C++ can still route to Nexus Browser Runtime;
- any workspace with more than one file routes away from Browser Runtime;
- Nexus WASM C++ Runtime receives all virtual files and compiles every `.c/.cpp/.cc/.cxx` translation unit;
- headers remain virtual filesystem inputs and are not compiled as translation units;
- `try/throw/catch` remains a documented provider limit of the pinned exception-disabled sysroot.

## Release gate
Local syntax, JSON, regression, benchmark, runtime routing, workspace, diagnostics, service-worker and HTTP smoke tests must pass before publication. Final multi-file Clang/WASI execution remains a live GitHub Pages acceptance gate.
