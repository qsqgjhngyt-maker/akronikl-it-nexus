# AKRONIKL IT NEXUS

**Engineering IT Learning Platform**

> **Nexus — the node of connections. The horizon beyond which knowledge becomes a system.**

Akronikl IT Nexus is a modular IT learning platform combining deep theory, interactive labs, programming, projects, practical placements, Skill Graph and the contextual AI mentor Akronikl.

## Mission

**High-quality engineering education should not begin with the question: “Can you afford it?”**

The core learning path is designed to remain free. The platform is Russian-first, not Russian-only, and is open to international learners.

## Languages

RU and EN are the first complete locales. The architecture is multilingual-by-design so additional languages can be added without rewriting the core. UI, course and Akronikl text/voice language can be selected independently.

## Status

**v0.1.6-alpha.1 / C++ WASI Exception ABI Alignment Hotfix.** The Polyglot Runtime Router now connects a real `Nexus WASM C++ Runtime`: Modern C++ is compiled inside a dedicated Worker using a pinned Clang/LLD toolchain and executed as a WASI module. Basic C++ still stays on the fast Browser Runtime.

**Historical UI baseline: v0.1.2-alpha.4.1 / Nexus Glass Dropdown Hotfix.** Native system select popups in the top bar have been replaced with a custom Nexus Glass Dropdown to eliminate bright Windows/Chromium menus and keep a consistent desktop/mobile appearance. All alpha.4 functionality remains intact.

**v0.1.2-alpha.4 / Benchmark UX & Sandbox Foundation.** The C++ benchmark lesson now has collapsible navigation, Focus Reading, a separate scrollable Terminology Reference with clickable terms, the adaptive Nexus Glass particle layer, and a provider-based Nexus Sandbox. Browser Runtime adds a compatibility adapter for standard forms such as `std::cout`, live structural checks, assignment requirements, learner-friendly diagnostics, and raw technical output as a secondary layer. Nexus Project Studio architecture is recorded for future versioned capstones, builds/tests, Akronikl Project Mentor, and Portfolio Release.

## Rights and licensing

Free access to knowledge is separate from the right to commercially resell the project. A public license is intentionally **not activated yet** until ownership, third-party materials and contribution rights are audited. The target model uses a noncommercial software license for code, CC BY-NC-SA 4.0 for original learning content, separate brand protection and original third-party licenses.

See [`RIGHTS_AND_LICENSING.en.md`](RIGHTS_AND_LICENSING.en.md) and [`docs/en/08-legal`](docs/en/08-legal).

## Documentation

Normative primary documentation: [`docs/ru`](docs/ru).  
English mirror: [`docs/en`](docs/en).

## First implementation plan

1. C++ v7 baseline regression and rights/provenance audit.
2. Extract platform core without changing behavior.
3. Create stable-ID `cpp` course package.
4. Migrate progress safely.
5. Add locale registry and Akronikl Context Model.
6. Create three reference-quality lessons.
7. Scale only after PASS.

## Repository

Official repository name: `akronikl-it-nexus`  
Namespace: `akronikl:it-nexus:*`


## Current benchmark focus

Nexus Lesson Standard 1.0 is now **Normative / Production** after three accepted C++ benchmark lessons and the `v0.1.4-alpha.2.2` live Runtime Diagnostics pass. C++ remains the reference course while the runtime architecture becomes polyglot.


## Current development

`v0.1.5-alpha.2` connects the first real extended provider to the Polyglot Runtime. Modern C++ / STL / OOP are routed to `Nexus WASM C++ Runtime`; the pinned Clang/WASI toolchain is lazy-loaded in a Worker, real compiler diagnostics are preserved, and learner source is not submitted to a remote compiler API.
