# ADR-0011 — Language-neutral Polyglot Runtime Core

**Status:** Accepted  
**Date:** 2026-09-21

## Context

The C++ benchmark exposed the limits of the lightweight JSCPP Browser Runtime. At the same time, the Programming domain is intended to evolve into a multilingual system covering major programming languages.

## Decision

Runtime Router and provider contract are language-neutral. The language is passed explicitly as `languageId`; each provider declares its languages and capabilities.

C++ is not hard-coded into the Router core. It remains the reference implementation.

## Consequences

- Python, Java, C#, Rust, Go, and other languages can be added without rewriting Sandbox;
- one UX is preserved across lessons, labs, and Project Studio;
- heavy toolchains are lazy-loaded through WASM or Secure Build;
- provider limitations remain distinct from learner-source errors;
- tests validate routing independently of any one language.
