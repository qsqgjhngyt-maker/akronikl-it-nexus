# AKRONIKL IT NEXUS

**Engineering IT Learning Platform**

> **Nexus — the node of connections. The horizon beyond which knowledge becomes a system.**

Akronikl IT Nexus is a modular IT learning platform combining deep theory, interactive labs, programming, projects, practical placements, a Skill Graph and the contextual AI mentor Akronikl.

## Status

**Foundation / pre-implementation.** The repository starts from a clean architecture. The original `cpp-course` is preserved as an immutable baseline and the source for the first C++ reference course, but its monolithic architecture is not copied into the new platform.

## Philosophy

**Nexus is the node of connections, the center where disciplines converge.**

“Event horizon” is used as a brand metaphor for the transition point beyond which isolated knowledge becomes an engineering system.

See [`docs/en/00-product/BRAND_PHILOSOPHY.md`](docs/en/00-product/BRAND_PHILOSOPHY.md).

## Documentation

Normative primary documentation: [`docs/ru`](docs/ru).  
English mirror: [`docs/en`](docs/en).

The Russian branch is the source of truth. English is maintained for international users.

## First implementation plan

1. C++ v7 baseline regression.
2. Extract platform core without changing behavior.
3. Create stable-ID `cpp` course package.
4. Migrate progress safely.
5. Build the Akronikl Context Model.
6. Create three reference-quality lessons.
7. Scale to other disciplines only after PASS.

## Repository

Official repository name: `akronikl-it-nexus`  
Namespace: `akronikl:it-nexus:*`
