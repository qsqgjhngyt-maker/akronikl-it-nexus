# Nexus Sandbox Runtime Capability Model

**Status:** architecture standard, v0.1.5-alpha.1
**Normative language:** RU; this file is the required English mirror.

## Goal

Starting with `v0.1.5-alpha.1`, Nexus Sandbox uses a **language-neutral Runtime Router**. C++ remains the first reference language, while the provider contract takes an explicit `languageId` and is designed for all Programming language tracks.

Nexus Sandbox remains one learning and engineering environment even when different topics require different execution engines. Learners should not need to manage runtime providers themselves.

## Three independent results

Sandbox must separate:

1. **Nexus static analysis** — basic structural source checks.
2. **Task checks** — explicit exercise requirements.
3. **Runtime/Build** — actual execution by the selected provider.

Passing the first two does not mean a full C++ compiler accepted the program. Likewise, a lightweight Browser Runtime failure must not automatically be presented as a learner-code error.

## Provider tiers

### Browser Runtime

Purpose: fast exercises, console I/O and immediate feedback.

Guaranteed scope: basic expressions, branches, loops, functions and simple console programs within the supported teaching subset.

Classes, constructors, inheritance, `virtual`, `override`, templates, exceptions and other advanced constructs are **best-effort** until a capability probe confirms them for the current runtime.

### WASM Runtime

Planned extended local provider. Its goal is wider modern C++ support while keeping browser-based cross-platform use.

### Secure Build Runner

Planned isolated server-side provider for multi-file projects, a full toolchain, tests and Project Studio build artifacts.

## Capability routing

Before execution, Nexus inspects the source capabilities it requires. The router selects the best available provider. Until extended providers are connected, Browser Runtime remains a clearly marked best-effort fallback for advanced features.

## Environment-limit diagnostics

When basic structural analysis finds no obvious structural issue but the runtime parser fails on a construct outside its guaranteed capability set, Nexus reports an **environment limitation** instead of declaring the source invalid C++.

This does not prove that the program is correct: Nexus static analysis is not a standard-conforming compiler. It only means that the current lightweight provider is not a reliable arbiter for that construct.

## Compatibility adapters

Only temporary runtime-copy transformations that leave learner source untouched and preserve intended semantics of correct code are allowed.

v0.1.4-alpha.2 permits one retry without `override`; `override` is a compile-time annotation that asks the compiler to verify an override. Learner source remains unchanged.

Nexus must not silently remove `virtual`, change inheritance, types, ownership or program logic merely to satisfy an old parser.

## Self-test

“Test environment” runs at least:

- a base console/stdout probe;
- a separate OOP capability probe.

Failure of the OOP probe does not mark the base runtime broken. The UI must show base console readiness and advanced OOP as best-effort.

## Project Studio

Project Studio uses the same Nexus Sandbox router. As a project grows, the visible environment stays the same while execution may move from Browser Runtime to WASM or Secure Build Runner without forcing learners into an external IDE.
