# Nexus Lesson Standard 1.0

**Status:** **Normative / Production 1.0**. Frozen after successful Benchmark 03 live smoke and Runtime Capability Diagnostics in `v0.1.4-alpha.2.2`.

## Goal

A Nexus lesson must guide a learner through **understand → model → experiment → diagnose → apply → prove understanding**, not merely deliver text. The standard assumes no prior professional vocabulary.

## Required structure

1. Practical purpose and learning outcomes.
2. Explicit prerequisites.
3. A core mental model before detail.
4. Foundational theory with expansions of terms and abbreviations.
5. Subject-specific interactive model where useful.
6. Execution/internal model with a clear boundary between language semantics and implementation techniques.
7. Line-by-line or construct-by-construct code analysis.
8. Controlled experiments: change → predict → run → explain.
9. Diagnostics: symptom → cause → fix.
10. Practice tasks at multiple levels.
11. Laboratory work with a proof-of-understanding criterion.
12. Knowledge checks that test transfer, not only recall.
13. Skill Graph links.
14. Terminology reference as an independent drawer.
15. Nexus Sandbox so an external IDE is not mandatory for normal course progression.
16. Fully authored RU/EN bodies for benchmark lessons; additional locales remain pluggable without core changes.

## Three benchmarks

- `cpp.first-cpp-program` — foundational theory, terminology, toolchain, Sandbox.
- `cpp.pointers-references-addresses` — interactive address/lifetime model.
- `cpp.oop-principles` — interactive class/object/invariant/inheritance/virtual-dispatch model.

## Quality rules

- Expand unfamiliar abbreviations such as IDE, ABI, OOP, and RAII when first materially used.
- Do not force every topic into an identical template; interactivity must be subject-specific.
- Do not present common implementation techniques as language-standard requirements; e.g. vtables are common ABI mechanisms, not mandatory C++ language entities.
- Sandbox must provide understandable status, human-readable diagnostics, and access to raw technical output.
- An external IDE may be optional enrichment but not a prerequisite for the normal learning path.
- Learner-facing lessons do not cite legacy PDF pages; provenance belongs in the internal editorial layer.

## Freeze rule

Benchmark 03 live smoke and Runtime Capability Diagnostics were accepted in `v0.1.4-alpha.2.2`. The standard is **frozen as Normative / Production 1.0**. Structural changes after that are versioned as 1.1+ and must regress against all three benchmarks.
