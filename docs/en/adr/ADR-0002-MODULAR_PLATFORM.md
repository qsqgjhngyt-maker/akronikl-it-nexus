> **Primary documentation language: Russian.** The Russian version is normative. The English version is maintained as a secondary mirror for international users.

# ADR-0002-MODULAR_PLATFORM — Modular platform instead of a monolithic index.html

**Status:** Accepted

## Decision
Separate the platform core, course packages, Akronikl modules and execution runners.

## Rationale
Scaling to dozens of disciplines inside the current monolith would create unacceptable coupling and make testing, releases and content evolution difficult.

## Consequences
This decision is part of the Foundation architecture contract. Changes require a new ADR rather than a silent rewrite of history.
