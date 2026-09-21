# Modern C++ WASM Runtime

## Goal

Allow Nexus Sandbox to compile and execute modern C++ inside the browser without an external IDE and without sending learner source to a remote compilation API.

## Pipeline

```text
source → Runtime Router → wasm-cpp → Worker → Clang/LLD → WASI module → WASI runner → stdout/stderr/exit code
```

## Toolchain

Pinned versions live in `sandbox/runtime-assets.js`. `v0.1.5-alpha.2` uses a browser Clang/LLD build and a WASI Preview 1 runner. The large toolchain is lazy-loaded only when required.

## Security / resilience

- Worker isolation;
- source-size limit;
- captured-output limit;
- independent load/compile/run watchdogs;
- Worker termination on timeout;
- no secret/API key in the frontend;
- no remote source-code submission in this provider;
- raw compiler diagnostics remain available.

## Routing

`browser-jscpp` remains the fast first choice for basic C++. `wasm-cpp` receives the higher route score for STL and Modern C++ capabilities, keeping early lessons fast while advanced lessons use a real compiler.

## Offline

Compiler assets are not part of the mandatory PWA core cache. After the first successful fetch, browser/Service Worker runtime caching may make later use available offline, subject to browser storage availability and eviction policy.

## Resource guards

`v0.1.5-alpha.2` caps a single source file at 512 KiB, total virtual input at 2 MiB, compiled `program.wasm` at 32 MiB, and captured output at 1 MiB. Compilation and execution also have separate watchdog timeouts. This is not a strict WebAssembly-engine heap cap, but it prevents the most obvious input/artifact growth inside the browser Sandbox.
