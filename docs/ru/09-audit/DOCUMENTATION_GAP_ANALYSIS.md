# Documentation Gap Analysis — v0.1.7-alpha.2.2.1

## Уже хорошо документировано
- product vision / scope;
- RU-first/EN-mirror principle;
- content standards;
- sandbox/runtime concepts;
- PWA;
- release/versioning;
- rights/legal foundation;
- ADR history;
- QA strategy;
- Cloud Sync LIVE evidence.

## Обязательные пробелы для v0.1.7-alpha.2.3

### P0 — закрыть до следующего крупного feature development
1. Current C4 Context.
2. Current C4 Container.
3. Production D1 ERD.
4. Data Dictionary.
5. Actual Cloud API catalogue.
6. Identity v1 security assessment.
7. Requirements Traceability Matrix.
8. AI research problem / hypothesis / evaluation plan.
9. Current-vs-target architecture status labels.

### P1
1. Target Identity/Auth architecture.
2. Threat Model.
3. Sequence diagrams:
   - bootstrap;
   - PUSH/PULL;
   - revision conflict;
   - future sign-in/session.
4. Deployment diagram.
5. Backup/recovery for D1 account/project state.
6. API error catalogue.

### P2
1. Admin/Control Center architecture.
2. CMS/content publishing model.
3. Blog/Journal model.
4. Support messaging model.
5. Skill Graph schema.
6. AI telemetry/privacy model.

## Стандарт маркировки
Каждый архитектурный документ должен явно указывать один из статусов:

- `IMPLEMENTED` — подтверждено текущим кодом;
- `FOUNDATION` — частично реализовано;
- `PLANNED` — утверждено в roadmap;
- `RESEARCH` — предмет исследования, решение ещё не принято;
- `DEPRECATED` — больше не отражает целевое состояние.
