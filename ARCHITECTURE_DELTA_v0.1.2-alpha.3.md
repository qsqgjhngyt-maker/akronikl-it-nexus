# Architecture Delta v0.1.2-alpha.3

New runtime modules:

```text
sandbox/
  sandbox.js
  diagnostics.js
  providers/
    browser-runtime.js
    wasm-runtime.js
    cloud-runtime.js
effects/
  particles.js
```

The lesson UI no longer owns a concrete C++ runner. It consumes the Sandbox controller, which selects a provider and exposes diagnostics/self-test. The current Browser Runtime applies a narrow compatibility transform for common `std::` stream/string names while preserving the learner source in storage.

Navigation state (`sidebarCollapsed`, `focusReading`, `effectsQuality`) is persisted in existing Nexus preferences. Terminology is rendered as an independent drawer rather than a long lesson-side glossary.

Project Studio is architecture-only in this release; no claim is made that native build artifacts/version branches are already implemented.
