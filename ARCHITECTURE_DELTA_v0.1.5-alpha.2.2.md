# Architecture Delta v0.1.5-alpha.2.2

## C++ ABI alignment

The Modern C++ provider now treats the pinned YoWASP sysroot as an explicit capability contract rather than assuming desktop Clang defaults.

- C++ translation units are compiled with `-fno-exceptions` because the pinned YoWASP libc++ / libc++abi are built with exceptions disabled.
- Standard-library/container/smart-pointer use remains supported inside that no-exception ABI.
- Explicit C++ exception syntax is surfaced as a provider limitation.
- The language-neutral Runtime Router contract is unchanged.

This prevents linker failures from being misreported as learner mistakes while keeping the provider boundary honest.
