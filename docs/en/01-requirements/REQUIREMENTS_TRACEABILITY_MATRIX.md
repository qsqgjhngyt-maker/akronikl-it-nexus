# Requirements Traceability Matrix — English Mirror

| Requirement | Status | Architecture/Component | Verification | Baseline |
| --- | --- | --- | --- | --- |
| FR-PLAT-001 | IMPLEMENTED | core/app.js | ui-alpha4-check.mjs | WORK02 catalog |
| FR-PLAT-002 | IMPLEMENTED | core/app.js | production-entry-syntax-check.mjs | WORK02 catalog |
| FR-PLAT-003 | IMPLEMENTED | core/app.js, core/storage.js | ui-alpha4-1-check.mjs | WORK02 catalog |
| FR-PLAT-004 | IMPLEMENTED | manifest.webmanifest, service-worker.js | service-worker-assets-check.mjs | WORK02 catalog |
| FR-COURSE-001 | IMPLEMENTED | courses/catalog.json, core/app.js | public-content-check.mjs | WORK02 catalog |
| FR-COURSE-002 | IMPLEMENTED | courses/cpp/* | lesson-standard-freeze-check.mjs | WORK02 catalog |
| FR-COURSE-003 | IMPLEMENTED | courses/cpp/* | public-content-check.mjs | WORK02 catalog |
| FR-COURSE-004 | FOUNDATION | course metadata/docs | — | WORK02 catalog |
| FR-PROGRESS-001 | IMPLEMENTED | core/storage.js | workspace-persistence-resume-check.mjs | WORK02 catalog |
| FR-PROGRESS-002 | PLANNED | target identity/profile layer | — | WORK02 catalog |
| FR-PROGRESS-003 | RESEARCH | target learning model | — | WORK02 catalog |
| FR-CODE-001 | IMPLEMENTED | sandbox/* | sandbox-provider-check.mjs | WORK02 catalog |
| FR-CODE-002 | IMPLEMENTED | sandbox/code-studio.js, sandbox/code-workspace.js | multi-file-code-studio-check.mjs | WORK02 catalog |
| FR-CODE-003 | IMPLEMENTED | sandbox/diagnostics.js | modern-cpp-compiler-integration-check.mjs | WORK02 catalog |
| FR-CODE-004 | IMPLEMENTED | sandbox/runtime-router.js, provider-contract.js | polyglot-runtime-check.mjs | WORK02 catalog |
| FR-CODE-005 | IMPLEMENTED | sandbox/providers/* | modern-cpp-safety-limits-check.mjs | WORK02 catalog |
| FR-PROJ-001 | IMPLEMENTED | project-studio/project-store.js | project-studio-foundation-check.mjs | WORK02 catalog |
| FR-PROJ-002 | IMPLEMENTED | project-studio/project-store.js | project-vfs-path-hotfix-check.mjs | WORK02 catalog |
| FR-PROJ-003 | IMPLEMENTED | project-studio/* | project-studio-foundation-check.mjs | WORK02 catalog |
| FR-PROJ-004 | FOUNDATION | project-studio/* | project-studio-foundation-check.mjs | WORK02 catalog |
| FR-PROJ-005 | PLANNED | target release layer | — | WORK02 catalog |
| FR-SYNC-001 | IMPLEMENTED | sync/cloud-sync.js | cloud-sync-client-transport-check.mjs | WORK02 catalog |
| FR-SYNC-002 | IMPLEMENTED | sync/cloud-sync.js | LIVE + cloud-sync-ui-check.mjs | WORK02 catalog |
| FR-SYNC-003 | IMPLEMENTED | sync/cloud-sync.js | LIVE PC↔iPhone | WORK02 catalog |
| FR-SYNC-004 | IMPLEMENTED | sync/cloud-sync.js + Worker | LIVE conflict test | WORK02 catalog |
| FR-SYNC-005 | IMPLEMENTED | sync/cloud-sync.js | LIVE recovery rev5→rev6 | WORK02 catalog |
| FR-SYNC-006 | FOUNDATION | sync/sync-queue.js | sync-team-foundation-check.mjs | WORK02 catalog |
| FR-AUDIT-001 | IMPLEMENTED | collaboration/audit-log.js + Worker/D1 | LIVE audit evidence | WORK02 catalog |
| FR-TEAM-001 | FOUNDATION | collaboration/access-control.js | sync-team-foundation-check.mjs | WORK02 catalog |
| FR-TEAM-002 | FOUNDATION | collaboration/access-control.js | sync-team-foundation-check.mjs | WORK02 catalog |
| FR-TEAM-003 | FOUNDATION | D1 migrations | cloudflare-sync-backend-foundation-check.mjs | WORK02 catalog |
| FR-ID-001 | FOUNDATION | core/identity.js, sync/cloud-sync.js | cloudflare-nexus-token-auth-check.mjs | WORK02 catalog |
| FR-ID-002 | PLANNED | target Identity v2 | — | WORK02 catalog |
| FR-ID-003 | PLANNED | target Identity v2 | — | WORK02 catalog |
| FR-ID-004 | PLANNED | target Identity v2 | — | WORK02 catalog |
| FR-ID-005 | PLANNED | target Identity v2 | — | WORK02 catalog |
| FR-ID-006 | PLANNED | target shell/account UI | — | WORK02 catalog |
| FR-ADMIN-001 | PLANNED | target admin layer | — | WORK02 catalog |
| FR-CMS-001 | PLANNED | target CMS | — | WORK02 catalog |
| FR-CMS-002 | PLANNED | target CMS | — | WORK02 catalog |
| FR-SUPPORT-001 | PLANNED | target support layer | — | WORK02 catalog |
| FR-AI-001 | FOUNDATION | akronikl/context.js | code inspection | WORK02 catalog |
| FR-AI-002 | RESEARCH | target AI research layer | experiment | WORK02 catalog |
| FR-AI-003 | RESEARCH | target AI research layer | experiment | WORK02 catalog |
| FR-AI-004 | RESEARCH | target AI research layer | retrieval evaluation | WORK02 catalog |
| FR-AI-005 | RESEARCH | target AI research layer | code-grounding evaluation | WORK02 catalog |
| FR-AI-006 | RESEARCH | target AI research layer | offline/online evaluation | WORK02 catalog |
| FR-AI-007 | PLANNED | AI policy | rubric evaluation | WORK02 catalog |
| FR-AI-008 | RESEARCH | AI evaluation plan | controlled experiment | WORK02 catalog |
| FR-AI-009 | PLANNED | target AI security | security tests | WORK02 catalog |
| FR-AI-010 | PLANNED | target AI UX | scenario tests | WORK02 catalog |
| NFR-PERF-001 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-PERF-002 | PLANNED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-MOBILE-001 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-A11Y-001 | FOUNDATION | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-REL-001 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-REL-002 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-REL-003 | PLANNED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-MAINT-001 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-MAINT-002 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-OBS-001 | FOUNDATION | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-DOC-001 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-I18N-001 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-I18N-002 | IMPLEMENTED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-OFFLINE-001 | FOUNDATION | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-PORT-001 | FOUNDATION | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-PRIV-001 | PLANNED | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-REPRO-001 | RESEARCH | cross-cutting | review/test/measure | WORK02 NFR |
| NFR-SCALE-001 | PLANNED | cross-cutting | review/test/measure | WORK02 NFR |
| SEC-SECRET-001 | IMPLEMENTED | security boundary | code/security test/review | WORK02 security |
| SEC-SECRET-002 | IMPLEMENTED | security boundary | code/security test/review | WORK02 security |
| SEC-AUTH-001 | IMPLEMENTED | security boundary | code/security test/review | WORK02 security |
| SEC-AUTH-002 | IMPLEMENTED | security boundary | code/security test/review | WORK02 security |
| SEC-AUTH-003 | PLANNED | security boundary | code/security test/review | WORK02 security |
| SEC-SESSION-001 | PLANNED | security boundary | code/security test/review | WORK02 security |
| SEC-SESSION-002 | PLANNED | security boundary | code/security test/review | WORK02 security |
| SEC-MFA-001 | PLANNED | security boundary | code/security test/review | WORK02 security |
| SEC-ACL-001 | FOUNDATION | security boundary | code/security test/review | WORK02 security |
| SEC-ACL-002 | FOUNDATION | security boundary | code/security test/review | WORK02 security |
| SEC-DATA-001 | IMPLEMENTED | security boundary | code/security test/review | WORK02 security |
| SEC-DATA-002 | PLANNED | security boundary | code/security test/review | WORK02 security |
| SEC-PRIV-001 | PLANNED | security boundary | code/security test/review | WORK02 security |
| SEC-AI-001 | PLANNED | security boundary | code/security test/review | WORK02 security |
| SEC-AI-002 | PLANNED | security boundary | code/security test/review | WORK02 security |
| SEC-API-001 | IMPLEMENTED | security boundary | code/security test/review | WORK02 security |
| SEC-API-002 | PLANNED | security boundary | code/security test/review | WORK02 security |
| AIR-001 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-002 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-003 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-004 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-005 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-006 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-007 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-008 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-009 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-010 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-011 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-012 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-013 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
| AIR-014 | RESEARCH | AI research architecture | experiment | WORK02 AI research |
