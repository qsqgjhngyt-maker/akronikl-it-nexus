# AKRONIKL IT NEXUS — Baseline Master Index

**Release:** `v0.1.7-alpha.2.3`  
**Название:** Architecture & AI Research Baseline  
**Дата:** 2026-09-26

## Назначение

Этот документ является главной точкой входа в инженерную документацию baseline `v0.1.7-alpha.2.3`.

## WORK01–WORK08

| Package | Назначение | Статус |
|---|---|---|
| v0.1.7-alpha.2.3-WORK01 | Current State Audit + Architecture & AI Research Baseline Kickoff | WORK01_COMPLETE |
| v0.1.7-alpha.2.3-WORK02 | Requirements Baseline | WORK02_COMPLETE |
| v0.1.7-alpha.2.3-WORK03 | Architecture Baseline | WORK03_COMPLETE |
| v0.1.7-alpha.2.3-WORK04 | Data Baseline | WORK04_COMPLETE |
| v0.1.7-alpha.2.3-WORK05 | Identity & Security Design | WORK05_COMPLETE_DESIGN |
| v0.1.7-alpha.2.3-WORK06 | AI Research Design | WORK06_COMPLETE_RESEARCH_DESIGN |
| v0.1.7-alpha.2.3-WORK07 | Product & Competitive Research | WORK07_COMPLETE_RESEARCH_SNAPSHOT |
| `0.1.7-alpha.2.3-WORK08` | Baseline Closure | COMPLETE |

## 1. Requirements
- `docs/ru/01-requirements/`
- FR / NFR / SEC / AIR identifiers
- Use Cases
- User Stories
- Acceptance Criteria
- Traceability

## 2. Architecture
- `docs/ru/02-architecture/`
- C4 Context / Container / Component
- Deployment
- DFD
- Cloud Sync sequences
- Identity v2 target
- AI boundary
- Trust boundaries

## 3. Data
- `docs/ru/03-data/`
- production D1 ERD
- Data Dictionary
- indexes/constraints
- browser-local models
- target Identity / Learning / Skill / AI data drafts
- migration/versioning policy

## 4. Security
- `docs/ru/04-security/`
- session security
- OAuth/OIDC broker
- account linking
- passkeys
- MFA/TOTP
- phone OTP
- recovery
- CSRF/CORS
- abuse protection
- Identity threat model

## 5. QA
- `docs/ru/05-qa/`
- existing runtime regression
- Identity security test plan
- AI experiment/test strategy
- acceptance gates

## 6. AI Research
- `docs/ru/10-ai-research/`
- Research Charter
- hypotheses
- Generic LLM baseline
- ablations
- Learner Model
- Skill Graph
- RAG
- Code Intelligence
- Context Engine
- Recommendation Engine
- metrics/statistics/reproducibility

## 7. Product / Competitive Research
- `docs/ru/10-research/`
- competitor profiles
- capability matrix
- evidence ledger
- market-gap hypotheses
- product differentiation
- monitoring plan

## 8. Diploma Evidence
- `docs/ru/09-diploma/`
- mapping Nexus → ВКР
- evidence indexes
- draft existing-solutions chapter

## 9. Audit / History
- `docs/ru/09-audit/`
- WORK closure reports
- technical debt
- documentation gaps
- baseline closure

## Source-of-truth rule

Русская документация является нормативной. Английская ветка — secondary mirror.

## Status rule

`IMPLEMENTED / FOUNDATION / PLANNED / RESEARCH / DEPRECATED`

Planned/research architecture must not be described as current implementation.
