# Third-party runtime components

## v0.1.5-alpha.2

The Modern C++ Runtime lazy-loads pinned third-party runtime components from a CDN:

- `@yowasp/clang@22.0.0-git20542-10` — browser Clang/LLVM/LLD toolchain;
- `@runno/wasi@0.10.0` — WASI Preview 1 runner.

These components do not become covered by a future Nexus project license automatically and retain their upstream licenses. Before public license activation, Nexus must record the required notices and provenance for the actual binary/runtime artifacts used.

In `v0.1.5-alpha.2` these dependencies are externally delivered pinned assets; learner source is compiled locally in the browser and is not submitted to a remote compilation API.
