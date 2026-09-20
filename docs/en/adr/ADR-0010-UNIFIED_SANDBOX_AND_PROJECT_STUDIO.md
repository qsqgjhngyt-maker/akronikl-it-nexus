# ADR-0010 — Unified Nexus Sandbox and Project Studio

**Status:** Accepted

## Decision
All programming courses use one learner-facing Nexus Sandbox. Execution is provided by interchangeable providers: Browser Runtime, WASM Runtime, and Secure Cloud/Build Runner. The same model later powers Nexus Project Studio with files, tests, builds, version memory, Akronikl Project Mentor, and Portfolio Release.

## Rationale
- courses must remain usable on desktop, tablet, and phone;
- an external VS Code/IDE cannot be mandatory;
- basic exercises and advanced projects need different compute capabilities but should not require different UX;
- a capstone should become a real portfolio artifact rather than only a completion certificate.

## Consequence
Programming-course UI must not depend directly on a specific runtime implementation. Runners connect through a provider contract.
