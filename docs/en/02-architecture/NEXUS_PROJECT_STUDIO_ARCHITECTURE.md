# Nexus Project Studio — capstone engineering project architecture

## Purpose
Nexus Project Studio is a dedicated AKRONIKL IT NEXUS module where a learner turns course knowledge into a real working product without leaving the platform. The intended learning path is **learn → understand → experiment → validate → build → release**.

## Core scenarios
- choose a suggested capstone or define an original idea;
- write a project brief and minimum viable version;
- maintain a project file tree;
- run, test, and build through Nexus Sandbox;
- receive contextual Akronikl guidance without replacing the learner's own work;
- create named snapshots and compare versions;
- restore a previous working version;
- produce build artifacts when supported by the selected provider;
- publish a Portfolio Card with description, demonstrated skills, tests, version history, and artifacts.

## Akronikl Project Mentor context
Akronikl receives only the allowed project context: specification, file tree, active source file, diagnostics/build output, tests, prior attempts, and relevant Skill Graph state. The mentor explains causes, proposes repair plans, reviews work, and helps decompose tasks rather than silently completing the project for the learner.

## Version memory
The beginner interface does not require Git knowledge. Learners see understandable snapshots such as `0.1 — first prototype`, `0.2 — inventory`, `1.0 — stable release`. A later Git course can map this model to commits, branches, diffs, and professional version control.

## Sandbox / Build
Project Studio consumes the unified Nexus Sandbox API. Browser Runtime handles fast exercises, a WASM provider expands local capability, and an isolated Secure Build Runner handles multi-file/native build workloads. Provider selection must not change the learner-facing workflow.

## Security
Cloud/build execution must be isolated with CPU/RAM/time quotas, restricted filesystem and network access, dependency controls, and no secrets exposed to the client.

## v0.1.7-alpha.1 implementation
Project Studio Foundation is implemented above the stable Code Studio baseline: persistent project entities, manifest, nested workspace, milestones, checkpoints/restore, and execution through the unified Runtime Router. C++ course projects create or resume the same Project Studio workspace.

## Sync and release
The project manifest already carries local-first sync/release metadata. Device-to-device cloud sync, conflict handling, source export, and Secure Build artifacts are later layers and do not require replacing the base project entity.

## Status
v0.1.7-alpha.1 — Foundation implemented; cloud sync/export/Secure Build/Nexus Tests are staged for later releases.
