# AKRONIKL IT NEXUS v0.1.5-alpha.2.2

## C++ WASI Exception ABI Alignment Hotfix

Live Modern C++ acceptance testing exposed linker errors for STL-heavy code:

- `undefined symbol: __cxa_allocate_exception`
- `undefined symbol: __cxa_throw`

The pinned YoWASP toolchain ships libc++ and libc++abi built with C++ exceptions disabled. Nexus previously compiled learner translation units with the Clang default exception mode, which allowed header/template code to emit references to exception ABI entry points that are intentionally absent from that sysroot.

This hotfix aligns learner compilation with the actual sysroot ABI by compiling C++ with `-fno-exceptions`. Standard Modern C++ code that does not explicitly use language-level exceptions (including `std::string`, containers, smart pointers, RAII, classes and virtual dispatch) can therefore link against the pinned runtime consistently.

Explicit `try`, `throw` and `catch` remain outside the capability of this pinned browser provider and are reported as an environment/provider limitation rather than a learner error. A future exception-enabled provider may lift this boundary without changing the Nexus Sandbox UX.

No lesson IDs, legacy indices, progress keys or benchmark lesson bodies are changed by this runtime hotfix.
