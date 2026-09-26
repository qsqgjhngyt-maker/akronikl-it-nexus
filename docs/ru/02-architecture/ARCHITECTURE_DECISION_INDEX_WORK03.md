# Architecture Decision Index — WORK03

## Existing decisions relevant to current baseline

| Decision | Meaning for WORK03 |
|---|---|
| ADR-0001 RU primary / EN mirror | Russian documentation remains normative |
| ADR-0002 Modular Platform | modules/contracts over monolithic page logic |
| ADR-0003 Secure AI Gateway | AI secrets/provider calls do not belong in public client |
| ADR-0010 Unified Sandbox and Project Studio | one runtime abstraction for learning/project flows |
| ADR-0011 Polyglot Runtime Core | provider/router is language-neutral |
| `ADR_0001_CLOUD_SYNC_D1_ONLY_OPTIMISTIC_CONCURRENCY_v0.1.7-alpha.2.2.1.md` | D1-only current storage + baseRevision conflict protection |

## Decisions intentionally NOT frozen in WORK03

These require later design/research and therefore do not receive fake ADR conclusions now:

- exact Identity v2 provider/broker implementation;
- session cookie vs other protected session representation;
- SMS provider;
- final MFA policy;
- Skill Graph mastery algorithm;
- Learner Model formula;
- RAG embedding/vector storage choice;
- AI provider/model choice;
- AI telemetry retention;
- automatic project merge algorithm;
- object storage reintroduction.

## ADR rule going forward

An ADR must state:
1. context/problem;
2. considered alternatives;
3. chosen decision;
4. consequences;
5. migration/rollback notes;
6. linked requirements;
7. evidence/metrics where applicable.
