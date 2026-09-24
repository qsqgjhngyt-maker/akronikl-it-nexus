# Component Inventory — v0.1.7-alpha.2.2.1

| Компонент | Путь | Фактический статус | Следующий шаг |
|---|---|---|---|
| Platform Shell | `core/app.js` | IMPLEMENTED | декомпозиция UI/account shell |
| Local storage | `core/storage.js` | IMPLEMENTED | cloud profile migration strategy |
| Identity v1 | `core/identity.js` | FOUNDATION | Identity v2 / sessions / providers |
| Akronikl context | `akronikl/context.js` | FOUNDATION | Learner/Project context gateway |
| Sandbox router | `sandbox/` | IMPLEMENTED | capability expansion |
| WASM C++ runtime | `sandbox/providers/wasm-runtime.js` | IMPLEMENTED | performance/compatibility profiling |
| Code Studio | `sandbox/code-studio.js` | IMPLEMENTED | modular editor evolution |
| Project Studio | `project-studio/` | IMPLEMENTED alpha | team/export/tests UX |
| ACL | `collaboration/access-control.js` | FOUNDATION | server/client parity tests |
| Local audit | `collaboration/audit-log.js` | FOUNDATION | unified server audit UX |
| Cloud provider | `sync/cloudflare-provider.js` | IMPLEMENTED | session auth migration |
| Cloud orchestration | `sync/cloud-sync.js` | IMPLEMENTED manual | background/queue later |
| Sync queue | `sync/sync-queue.js` | FOUNDATION | offline reconciliation |
| Worker | `cloudflare/nexus-sync-worker/` | IMPLEMENTED | Identity v2/API versioning |
| D1 schema | migrations 0001–0003 | IMPLEMENTED | normalized identity/learning schema |
| C++ course | `courses/cpp/` | IMPLEMENTED/reference | content later, after platform baseline |
| AI gateway | — | PLANNED | research + architecture first |
| Learner Model | — | RESEARCH | formal model + events |
| Knowledge Graph | — | RESEARCH | ontology + mastery |
| Recommendation Engine | — | RESEARCH | baseline algorithms |
| Admin/Control Center | — | PLANNED | after identity/cloud profile |
| CMS/Blog/Support | — | PLANNED | after admin foundation |
