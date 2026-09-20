# Benchmark 01 — “Your First C++ Program”

ID: `cpp.first-cpp-program`

Status: **Benchmark Standard 1.1 / RU+EN complete**

## Purpose

The lesson must prove that Nexus is not a collection of short cards but a knowledge-assimilation system: initial mental model → foundational theory → terminology → execution model → interactive practice → diagnostics → lab → understanding check → Skill Graph.

## Required properties

- the learner distinguishes the C++ language, source code, an IDE, compiler, linker, runtime, and OS;
- terms and abbreviations are expanded when they first become relevant;
- the lesson explains `source → preprocess → compile → object code → link → runtime → main → exit code`;
- learner-facing content contains no references to the original PDF/source document structure;
- provenance remains in internal documentation rather than the learning UI;
- a modern portable example is used;
- errors are treated diagnostically: symptom → stage → cause → fix;
- theory connects to practice, a lab, and Skill Graph;
- RU and EN share one stable lesson ID and one progress state;
- the core exercise runs in `Nexus Sandbox` without requiring VS Code, Visual Studio, or another desktop IDE.

## Sandbox requirement

The learner must be able to edit code, provide `stdin`, run the program, inspect `stdout`/diagnostics, self-test the runtime, save lesson code, and complete the basic workflow in a desktop or mobile browser without mandatory external IDE software.

## Acceptance criterion

After the lesson the learner can explain `#include`, `iostream`, `std`, `::`, `std::cout`, `<<`, `main`, `;`, `\n`, `return 0`, classify compile/link/runtime failures, and execute a basic program inside Nexus Sandbox.
