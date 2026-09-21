# Nexus Polyglot Runtime Architecture

**Status:** Foundation / v0.1.5-alpha.1  
**Normative language:** RU

## Decision

Nexus Sandbox is a language-neutral engineering environment. Sandbox core, Runtime Router, and the provider contract must not assume that C++ is the only or privileged executable language.

C++ remains the first reference language and the first consumer of the extended WASM runtime, but that is not an architectural restriction.

## Execution flow

```text
Lesson / Lab / Project
        │
        ▼
 languageId + source + stdin + files + metadata
        │
        ▼
 Nexus Runtime Router
        │
        ├── Browser providers
        ├── WASM providers
        └── Secure Build providers
                │
                ▼
 stdout / stderr / exit code / diagnostics / artifacts
```

The learner presses a single **Run** button. Provider selection is a platform responsibility.

## Language Registry

`sandbox/languages.js` stores stable language-neutral IDs and editor metadata. The registry can grow without changing the Router.

The initial planned set covers C, C++, Rust, Python, Java, C#, Go, JavaScript, TypeScript, Kotlin, Swift, Dart, PHP, Ruby, Scala, Bash, PowerShell, R, Julia, Lua, 1C:Enterprise, Assembly, Fortran, and Perl.

The list is not closed. SQL primarily belongs to the Databases domain but may use the same provider contract.

## Provider Contract

Every provider declares:

- `id`, `label`, `tier`;
- `languages[]`;
- `capabilities`;
- `available(request)`;
- `inspect(request)`;
- `run(request)`.

The standard runtime request is:

```text
languageId
source
stdin
files
metadata
```

A provider rates a request as `guaranteed`, `best-effort`, or `unsupported`.

The Router selects the best **available** provider. If a better provider is known but not yet available, an explicit fallback is allowed and must be visible in the UI.

## Runtime tiers

### Browser

Fast local execution for lightweight exercises. It is not required to implement a complete language toolchain.

### WASM

Extended local runtime isolated in a Worker. The C++ target is a modern compiler, standard library, virtual filesystem, and WASI-compatible execution.

`v0.1.5-alpha.1` implements the Worker/lifecycle foundation; the Modern C++ compiler itself is the next integration stage.

### Secure Build

Future isolated backend for multi-file projects, heavy toolchains, tests, build artifacts, and Project Studio.

## UX rule

Learners do not manually choose runtimes during normal course progression. Nexus shows which provider was selected and why, while routing remains automatic.

A provider limitation must never be presented as a proven learner-code error.

## Mobile / performance

Heavy runtime assets are loaded lazily. A phone should not download compiler/WASM assets when a lightweight Browser provider is sufficient.

WASM compilation runs outside the UI thread through a Web Worker.

## Next stage

`v0.1.5-alpha.2 — Modern C++ Compiler Integration` turns `wasm-cpp` from a foundation/provider candidate into a real provider and must pass the reference test for `<string>`, STL, OOP, RAII, and smart pointers.
