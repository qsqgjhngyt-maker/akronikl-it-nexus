# AKRONIKL IT NEXUS v0.1.5-alpha.2

## Modern C++ Compiler Integration

This release connects the first real extended provider to the language-neutral Runtime Router introduced in `v0.1.5-alpha.1`.

### What is live

- simple C++ → `Nexus Browser Runtime`;
- Modern C++ / STL / OOP → `Nexus WASM C++ Runtime`;
- compiler: pinned browser Clang/LLD toolchain;
- target: `wasm32-wasip1`;
- execution: WASI Preview 1 inside the same dedicated Worker;
- UI progress: toolchain load → compile → run;
- diagnostics: real compiler line/column + raw technical output;
- safety: phase-specific timeout plus source, total virtual-input, compiled-WASM and output limits.

### First-run note

The Modern C++ compiler is intentionally lazy-loaded and is a large dependency. The first Modern C++ launch therefore requires network access and can take significantly longer than later runs. The core Nexus shell and simple Browser Runtime remain lightweight.

### Privacy model

The learner source is passed to the compiler running in the browser Worker. The external CDN is used to download pinned runtime/toolchain assets; Nexus does not send learner source to a remote compilation API in this release.

### Acceptance target

The live acceptance program uses `<string>`, `<vector>`, `<memory>`, abstract polymorphism, `override`, `std::unique_ptr` and `std::make_unique`, and must print `Printer` with exit code `0` through `Nexus WASM C++ Runtime`.

### Release gate

Local automated tests validate routing, Worker protocol, compiler diagnostics, stable IDs, benchmark invariants, Service Worker assets and PATCH/FULL reconstruction. Final desktop/mobile status still requires live GitHub Pages smoke because the compiler assets are network-delivered browser modules.
