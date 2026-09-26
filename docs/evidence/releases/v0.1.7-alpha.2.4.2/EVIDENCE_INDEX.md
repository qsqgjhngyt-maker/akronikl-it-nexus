# LIVE Evidence Index — v0.1.7-alpha.2.4.2

**Release:** Identity v2 Session Foundation  
**Дата:** 2026-09-26  
**Scope:** production D1 + Worker + legacy compatibility + controlled session lifecycle.  
**Security:** raw `nxk_...`, raw `nxs_...` и `BOOTSTRAP_SECRET` в evidence не публикуются.

| # | Evidence | Что подтверждает |
|---:|---|---|
| 01 | `01_d1_tables_verified.webp` | D1: три таблицы Identity v2 подтверждены. |
| 02 | `02_d1_indexes_verified.webp` | D1: пять индексов Identity v2 подтверждены. |
| 03 | `03_d1_initial_zero_state.webp` | D1: новые таблицы до session-теста пусты — 0/0/0. |
| 04 | `04_worker_production_settings_baseline.webp` | Production Worker: текущие переменные, Secret и D1 binding. |
| 05 | `05_bridge_disabled_before_test.webp` | IDENTITY_V2_BRIDGE_ENABLED=false до session-теста. |
| 06 | `06_worker_identity_foundation_code.webp` | Worker v0.1.7-alpha.2.4.2 identity-foundation загружен в редактор. |
| 07 | `07_worker_deployed_active.webp` | Новая версия Worker развёрнута/активна. |
| 08 | `08_preview_old_response_diagnostic.webp` | Диагностика: встроенный Preview показал старое/неподходящее поведение; production проверен напрямую. |
| 09 | `09_production_health_pass.webp` | Production /api/v1/health: identity foundation и D1 подтверждены. |
| 10 | `10_capabilities_bridge_false_pass.webp` | /api/v2/auth/capabilities: sessionFoundation=true, bridge=false. |
| 11 | `11_legacy_cloud_sync_before_pull.webp` | Legacy Cloud Sync baseline перед PULL: cloud rev 6. |
| 12 | `12_legacy_cloud_sync_pull_pass.webp` | Legacy Cloud Sync PULL PASS на новом Worker. |
| 13 | `13_legacy_cloud_sync_push_rev7_pass.webp` | Legacy Cloud Sync PUSH PASS, cloud revision 6→7. |
| 14 | `14_bridge_isolation_zero_after_sync.webp` | Bridge isolation: после legacy PULL/PUSH Identity-таблицы остаются 0/0/0. |
| 15 | `15_bridge_temporarily_enabled.webp` | Controlled test window: IDENTITY_V2_BRIDGE_ENABLED=true. |
| 16 | `16_capabilities_bridge_true_pass.webp` | Capabilities подтверждает bridgeEnabled=true во временном окне. |
| 17 | `17_browser_devtools_test_setup.webp` | Безопасный browser test setup без вывода raw credentials. |
| 18 | `18_session_bridge_create_auth_pass.webp` | nxs session create/authentication PASS. |
| 19 | `19_session_list_current_pass.webp` | Session list PASS: текущая active legacy-bridge session найдена. |
| 20 | `20_session_revoke_401_pass.webp` | Revoke PASS: та же session отклонена с 401 INVALID_SESSION. |
| 21 | `21_d1_lifecycle_counts.webp` | D1 lifecycle: 1 device, 1 session, 0 active, 1 revoked, 2 security events. |
| 22 | `22_d1_security_audit_events.webp` | D1 security audit: bridge_created + revoked, оба success. |
| 23 | `23_bridge_restored_false.webp` | После теста production bridge возвращён в false. |
| 24 | `24_final_capabilities_bridge_false.webp` | Финальная capability-проверка: bridge=false, session foundation остаётся true. |

## LIVE result

```text
D1 migration 0004 ................ PASS
3 Identity tables ................ PASS
5 indexes ........................ PASS
Production Worker ................ PASS
/api/v1/health ................... PASS
/api/v2/auth/capabilities ........ PASS
Legacy Cloud Sync PULL ........... PASS
Legacy Cloud Sync PUSH ........... PASS
Cloud revision 6 → 7 ............. PASS
Bridge isolation while false ..... PASS
Controlled bridge enable ......... PASS
nxs create/auth .................. PASS
session list/current ............. PASS
server-side revoke ............... PASS
revoked credential → 401 ......... PASS
D1 revoked state ................. PASS
security audit ................... PASS
temporary browser session removed  PASS
bridge restored false ............ PASS
```

**Core session lifecycle status: FULL LIVE PASS.**

Frontend `v0.1.7-alpha.2.4.2` overlay is automated-test PASS and must receive a final post-publish visual smoke before GitHub Release is marked fully published.
