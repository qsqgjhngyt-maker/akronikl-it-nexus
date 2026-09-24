# Requirements Traceability Seed — v0.1.7-alpha.2.3

Это начальная матрица. В WORK02 требования будут нормализованы полностью.

| ID | Требование | Current component | Verification | Status |
|---|---|---|---|---|
| FR-SYNC-001 | отправить проект в cloud | `sync/cloud-sync.js` | LIVE PUSH rev1/rev2 | VERIFIED |
| FR-SYNC-002 | получить проект на другом устройстве | `pullProjectNow` | PC→iPhone, iPhone→PC | VERIFIED |
| FR-SYNC-003 | stale write не должен перезаписывать новую версию | Worker `baseRevision` | conflict LIVE test | VERIFIED |
| FR-AUDIT-001 | фиксировать PUSH/PULL | local/server audit | LIVE screenshots | VERIFIED |
| SEC-AUTH-001 | сервер не хранит raw account token | Worker SHA-256 | code/schema inspection | VERIFIED |
| SEC-AUTH-002 | bootstrap закрывается после первого account | Worker bootstrap count | `bootstrapOpen=false` | VERIFIED |
| SEC-AUTH-003 | production login не должен требовать ручного long-lived token | — | — | PLANNED |
| FR-IDENTITY-001 | вход на любом устройстве должен восстанавливать cloud profile | foundation only | — | PLANNED |
| FR-AI-001 | AI учитывает learner/project context | `akronikl/context.js` partial | code inspection | FOUNDATION |
| FR-AI-002 | AI использует Learner Model | — | — | RESEARCH |
| FR-AI-003 | AI использует Skill/Knowledge Graph | — | — | RESEARCH |
| FR-AI-004 | AI ответы оцениваются относительно generic baseline | — | experiment plan | RESEARCH |
