# CHANGELOG v0.1.5-alpha.2

- `wasm-cpp` promoted from planned foundation to real on-demand Modern C++ provider.
- Added pinned browser Clang/LLD toolchain integration through `@yowasp/clang`.
- Added WASI Preview 1 program execution through `@runno/wasi`.
- Modern C++ compilation and execution run in a dedicated Web Worker.
- Added lazy toolchain loading with progress reporting in the Sandbox UI.
- Added compiler/run timing, provider, compiler, target, stdout/stderr and exit-code reporting.
- Added real Clang line/column diagnostics; compiler errors are not misclassified as provider limitations.
- Added separate toolchain, compile and execution watchdog limits.
- Added source/output safety limits, total virtual-input and compiled-WASM size guards, and worker termination on timeout.
- Fixed release-version cache-busters/UI labels so `index.html`, topbar, footer and Service Worker consistently report `v0.1.5-alpha.2`.
- Added runtime CDN cache namespace in the Service Worker without bloating the core PWA cache.
- Added Modern C++ integration regression tests and the reference acceptance program covering `std::string`, `std::vector`, `std::unique_ptr`, virtual dispatch and `override`.
- Simple C++ remains on the fast Browser Runtime.
- Lesson content, stable IDs, legacy progress migration and Lesson Standard 1.0 remain unchanged.
