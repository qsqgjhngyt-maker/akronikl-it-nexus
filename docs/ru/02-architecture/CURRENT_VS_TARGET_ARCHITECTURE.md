# Current vs Target Architecture

| Area | Current `v0.1.7-alpha.2.2.1` | Target direction | Status |
|---|---|---|---|
| Frontend | GitHub Pages PWA | retain static/mobile-first shell where practical | IMPLEMENTED |
| Course state | browser local state | cloud-linked profile + offline cache | PLANNED |
| Code execution | browser/WASM + provider abstraction | polyglot providers + isolated build services where needed | FOUNDATION |
| Projects | local-first Project Studio | full release/export/team lifecycle | FOUNDATION |
| Cloud project storage | Worker + D1-only snapshots | keep D1 initially; revisit object storage only by measured need | IMPLEMENTED |
| Sync | explicit manual PUSH/PULL | offline queue/background UX after correctness | FOUNDATION |
| Concurrency | baseRevision optimistic concurrency | possible diff/merge assistance | IMPLEMENTED / future RESEARCH |
| Identity | local identity + manually stored Nexus token | federated account, passkeys, MFA, sessions/devices | PLANNED |
| Authorization | Worker ACL role/path/effect | expand membership/invite/admin UX | FOUNDATION |
| Audit | local + server project audit | unified searchable operation/audit console | FOUNDATION |
| Admin | none | Nexus Control Center | PLANNED |
| CMS | static repository content | controlled content publishing workflow | PLANNED |
| Support | none | in-platform developer/support threads | PLANNED |
| Skill model | prerequisites foundation | Skill/Knowledge Graph + mastery | RESEARCH |
| AI | minimal Context v1, no production LLM call | Context Gateway + Learner Model + RAG + Project Grounding + LLM | RESEARCH |
| Observability | tests + audit + health | system metrics, error telemetry, admin status | FOUNDATION |
| Security session | long-lived token in localStorage | revocable protected session model | PLANNED |

## Design rule

Target architecture is a direction, not evidence of implementation. New target components become `IMPLEMENTED` only after code, tests and evidence.
