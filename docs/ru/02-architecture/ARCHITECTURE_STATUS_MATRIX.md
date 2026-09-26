# Architecture Status Matrix — WORK03

| Capability | Requirement links | Component | Status | Evidence/verification |
|---|---|---|---|---|
| Platform Shell | FR-PLAT-001..004 | `core/app.js`, PWA files | IMPLEMENTED | regression suite |
| Course engine | FR-COURSE-001..004 | `courses/*`, registry | IMPLEMENTED/FOUNDATION | course/content tests |
| Local progress | FR-PROGRESS-001 | `core/storage.js` | IMPLEMENTED | persistence tests |
| Cloud progress | FR-PROGRESS-002 | target profile layer | PLANNED | — |
| Skill mastery | FR-PROGRESS-003, AIR-004/005 | target learner/graph | RESEARCH | future experiment |
| Code Studio | FR-CODE-001..003 | `sandbox/*` | IMPLEMENTED | runtime/editor tests |
| Runtime Router | FR-CODE-004/005 | provider contracts | IMPLEMENTED | polyglot/runtime tests |
| Project Studio | FR-PROJ-001..004 | `project-studio/*` | IMPLEMENTED/FOUNDATION | project tests |
| Release artifacts | FR-PROJ-005 | target release layer | PLANNED | — |
| Cloud Sync PUSH/PULL | FR-SYNC-001..003 | `sync/*`, Worker | IMPLEMENTED | tests + LIVE |
| Conflict protection | FR-SYNC-004/005 | baseRevision | IMPLEMENTED | LIVE conflict/recovery |
| Offline sync queue | FR-SYNC-006 | `sync/sync-queue.js` | FOUNDATION | foundation test |
| Audit | FR-AUDIT-001 | local + D1 audit | IMPLEMENTED | LIVE audit |
| Team roles/scopes | FR-TEAM-001/002 | ACL client/Worker | FOUNDATION | foundation tests |
| Team invites | FR-TEAM-003 | D1 schema | FOUNDATION | schema test |
| Identity v1 | FR-ID-001 | `core/identity.js`, nexus-token | FOUNDATION | auth test/LIVE |
| Federated Identity v2 | FR-ID-002..006 | target | PLANNED | WORK05 |
| Admin/CMS/Journal | FR-ADMIN/CMS | target | PLANNED | — |
| Support | FR-SUPPORT-001 | target | PLANNED | — |
| Akronikl Context v1 | FR-AI-001 | `akronikl/context.js` | FOUNDATION | code inspection |
| Learner Model | FR-AI-002, AIR-004 | target | RESEARCH | future evaluation |
| Skill Graph | FR-AI-003, AIR-005 | target | RESEARCH | future evaluation |
| RAG | FR-AI-004, AIR-006 | target | RESEARCH | retrieval evaluation |
| Code grounding | FR-AI-005, AIR-007 | target | RESEARCH | grounding evaluation |
| Recommendation | FR-AI-006 | target | RESEARCH | offline/online evaluation |
| AI privacy/security | FR-AI-009, SEC-AI-* | target policy/gateway | PLANNED | security tests later |
