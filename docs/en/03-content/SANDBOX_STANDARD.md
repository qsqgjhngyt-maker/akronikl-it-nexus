# Nexus Sandbox Standard

## Principle

Hands-on work belongs inside the Nexus ecosystem. Learners should not be forced to leave the platform and install a desktop IDE merely to complete core course exercises.

## Required baseline

Where technically feasible, programming courses provide an in-platform code editor, `stdin`, `stdout`, run/diagnostic controls, example reset, saved learner code, runtime self-test, responsive keyboard/touch UI, and one consistent Nexus experience independent of the runtime provider.

## Provider-independent architecture

The Sandbox UI must not be tied to a single execution provider. The same interface may later use a browser runtime, WebAssembly runtime, secure compiler backend, or an optional local expert toolchain.

## Mobile requirement

The core learning workflow must not require VS Code or Visual Studio. Mobile code fields should disable unwanted autocorrect/autocapitalization and avoid font sizes that trigger forced zoom on iOS.

## Reliability

Release QA must cover runtime self-test, reference-program execution, `stdin → program → stdout`, clear unavailable-runtime errors, code persistence, and desktop/mobile smoke tests.

## Current alpha boundary

The current C++ runtime is an educational browser implementation and is not presented as a complete replacement for an industrial native toolchain. Advanced lessons may use another provider without changing the learner-facing Sandbox interface.
