# Functional Requirements Catalog — English Mirror

For exact normative requirement wording, see the Russian catalog. IDs, priority, status, component and verification are synchronized below.

| ID | Priority | Status | Domain | Component | Verification |
| --- | --- | --- | --- | --- | --- |
| FR-PLAT-001 | P0 | IMPLEMENTED | Платформенная оболочка | core/app.js | ui-alpha4-check.mjs |
| FR-PLAT-002 | P0 | IMPLEMENTED | Маршрутизация | core/app.js | production-entry-syntax-check.mjs |
| FR-PLAT-003 | P1 | IMPLEMENTED | Настройки UI | core/app.js, core/storage.js | ui-alpha4-1-check.mjs |
| FR-PLAT-004 | P0 | IMPLEMENTED | PWA | manifest.webmanifest, service-worker.js | service-worker-assets-check.mjs |
| FR-COURSE-001 | P0 | IMPLEMENTED | Каталог курсов | courses/catalog.json, core/app.js | public-content-check.mjs |
| FR-COURSE-002 | P0 | IMPLEMENTED | Урок | courses/cpp/* | lesson-standard-freeze-check.mjs |
| FR-COURSE-003 | P0 | IMPLEMENTED | C++ reference course | courses/cpp/* | public-content-check.mjs |
| FR-COURSE-004 | P1 | FOUNDATION | Prerequisites | course metadata/docs | — |
| FR-PROGRESS-001 | P0 | IMPLEMENTED | Локальный прогресс | core/storage.js | workspace-persistence-resume-check.mjs |
| FR-PROGRESS-002 | P0 | PLANNED | Облачный прогресс | target identity/profile layer | — |
| FR-PROGRESS-003 | P1 | RESEARCH | Skill mastery | target learning model | — |
| FR-CODE-001 | P0 | IMPLEMENTED | Редактирование и запуск | sandbox/* | sandbox-provider-check.mjs |
| FR-CODE-002 | P0 | IMPLEMENTED | Multi-file workspace | sandbox/code-studio.js, sandbox/code-workspace.js | multi-file-code-studio-check.mjs |
| FR-CODE-003 | P0 | IMPLEMENTED | Diagnostics | sandbox/diagnostics.js | modern-cpp-compiler-integration-check.mjs |
| FR-CODE-004 | P1 | IMPLEMENTED | Runtime Router | sandbox/runtime-router.js, provider-contract.js | polyglot-runtime-check.mjs |
| FR-CODE-005 | P1 | IMPLEMENTED | Modern C++ WASM | sandbox/providers/* | modern-cpp-safety-limits-check.mjs |
| FR-PROJ-001 | P0 | IMPLEMENTED | Project entity | project-studio/project-store.js | project-studio-foundation-check.mjs |
| FR-PROJ-002 | P0 | IMPLEMENTED | Project VFS | project-studio/project-store.js | project-vfs-path-hotfix-check.mjs |
| FR-PROJ-003 | P0 | IMPLEMENTED | Checkpoints | project-studio/* | project-studio-foundation-check.mjs |
| FR-PROJ-004 | P1 | FOUNDATION | Milestones | project-studio/* | project-studio-foundation-check.mjs |
| FR-PROJ-005 | P1 | PLANNED | Export/Release | target release layer | — |
| FR-SYNC-001 | P0 | IMPLEMENTED | Cloud connection | sync/cloud-sync.js | cloud-sync-client-transport-check.mjs |
| FR-SYNC-002 | P0 | IMPLEMENTED | PUSH | sync/cloud-sync.js | LIVE + cloud-sync-ui-check.mjs |
| FR-SYNC-003 | P0 | IMPLEMENTED | PULL cross-device | sync/cloud-sync.js | LIVE PC↔iPhone |
| FR-SYNC-004 | P0 | IMPLEMENTED | Optimistic concurrency | sync/cloud-sync.js + Worker | LIVE conflict test |
| FR-SYNC-005 | P0 | IMPLEMENTED | Conflict recovery | sync/cloud-sync.js | LIVE recovery rev5→rev6 |
| FR-SYNC-006 | P1 | FOUNDATION | Offline sync queue | sync/sync-queue.js | sync-team-foundation-check.mjs |
| FR-AUDIT-001 | P0 | IMPLEMENTED | Audit trail | collaboration/audit-log.js + Worker/D1 | LIVE audit evidence |
| FR-TEAM-001 | P1 | FOUNDATION | Project roles | collaboration/access-control.js | sync-team-foundation-check.mjs |
| FR-TEAM-002 | P1 | FOUNDATION | Path-scoped ACL | collaboration/access-control.js | sync-team-foundation-check.mjs |
| FR-TEAM-003 | P1 | FOUNDATION | Membership/invites | D1 migrations | cloudflare-sync-backend-foundation-check.mjs |
| FR-ID-001 | P0 | FOUNDATION | Nexus identity v1 | core/identity.js, sync/cloud-sync.js | cloudflare-nexus-token-auth-check.mjs |
| FR-ID-002 | P0 | PLANNED | Unified Nexus Account | target Identity v2 | — |
| FR-ID-003 | P1 | PLANNED | Identity providers | target Identity v2 | — |
| FR-ID-004 | P0 | PLANNED | MFA/Passkeys | target Identity v2 | — |
| FR-ID-005 | P0 | PLANNED | Sessions/devices | target Identity v2 | — |
| FR-ID-006 | P1 | PLANNED | Visible account state | target shell/account UI | — |
| FR-ADMIN-001 | P1 | PLANNED | Nexus Control Center | target admin layer | — |
| FR-CMS-001 | P1 | PLANNED | Course CMS | target CMS | — |
| FR-CMS-002 | P2 | PLANNED | Nexus Journal | target CMS | — |
| FR-SUPPORT-001 | P1 | PLANNED | Связь с разработчиком | target support layer | — |
| FR-AI-001 | P0 | FOUNDATION | Context Model | akronikl/context.js | code inspection |
| FR-AI-002 | P0 | RESEARCH | Learner Model | target AI research layer | experiment |
| FR-AI-003 | P0 | RESEARCH | Skill/Knowledge Graph | target AI research layer | experiment |
| FR-AI-004 | P0 | RESEARCH | Course RAG | target AI research layer | retrieval evaluation |
| FR-AI-005 | P0 | RESEARCH | Project/Code intelligence | target AI research layer | code-grounding evaluation |
| FR-AI-006 | P1 | RESEARCH | Recommendation engine | target AI research layer | offline/online evaluation |
| FR-AI-007 | P0 | PLANNED | Pedagogical behavior | AI policy | rubric evaluation |
| FR-AI-008 | P0 | RESEARCH | AI baseline comparison | AI evaluation plan | controlled experiment |
| FR-AI-009 | P0 | PLANNED | AI permission boundary | target AI security | security tests |
| FR-AI-010 | P1 | PLANNED | Unified assistant modes | target AI UX | scenario tests |
