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

**v0.1.2-alpha.1 / Benchmark Lesson 01.** The working v0.1.1-alpha.3 runtime remains the baseline. C++ is the first reference course, and `cpp.first-cpp-program` is now the first full Nexus benchmark lesson: deep theory, toolchain internals, line-by-line walkthrough, controlled experiments, symptom→cause→fix error cases, lab work, Skill Graph links, and complete RU/EN lesson bodies. The remaining 39 topics still use the v7 baseline.

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


## Current implementation

**v0.1.1-alpha.1 / Platform Shell + C++ Reference Integration.** The Foundation is preserved. The root `index.html` is now self-diagnostic, and the C++ v7 monolith has been decomposed into a modular course package with 40 Russian lesson bodies, 6 practicums, 7 projects, quizzes, browser sandbox, and a safe legacy-progress bridge. The original `cpp-course` remains an immutable reference baseline.

See [`RELEASE_v0.1.1-alpha.1.md`](RELEASE_v0.1.1-alpha.1.md).
