# CHANGELOG v0.1.5-alpha.2.2

- Align Modern C++ compilation with the pinned YoWASP libc++/libc++abi build by adding `-fno-exceptions` to C++ compilation.
- Fix STL/OOP link failures that surfaced as unresolved `__cxa_allocate_exception` / `__cxa_throw` symbols.
- Explicit `try` / `throw` / `catch` is now reported as a provider capability limit instead of a learner-code error.
- Added regression coverage for ABI flag alignment and exception-capability diagnostics.
- Runtime Router, lesson bodies, stable IDs and legacy progress migration remain unchanged.

