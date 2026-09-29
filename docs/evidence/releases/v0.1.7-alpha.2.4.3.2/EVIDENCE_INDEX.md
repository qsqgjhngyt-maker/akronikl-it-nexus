# Evidence Index — v0.1.7-alpha.2.4.3.2

These images document the controlled pre-hotfix Identity v2 lifecycle and the stale-summary defect that triggered this release.

| # | Evidence | Meaning |
|---:|---|---|
| 1 | `01_disposable_session_created.webp` | Disposable `nxs_...` session created; credential not exposed. |
| 2 | `02_bridge_disabled.webp` | Migration bridge returned to false before UI revoke. |
| 3 | `03_server_session_active_ui.webp` | Account Center uses current active server session. |
| 4 | `04_revoke_stale_summary_defect.webp` | Revoke succeeds and LIVE block falls back, while top summary remains stale. |
| 5 | `05_reload_confirms_legacy_fallback.webp` | F5 confirms canonical state was already legacy fallback. |
| 6 | `06_d1_counts_after_revoke.webp` | D1 counters: devices=2, sessions=2, active=0, revoked=2, events=4. |
| 7 | `07_security_audit_events.webp` | Security audit records bridge_created and revoked events as success. |

**Post-fix no-F5 LIVE screenshot:** pending after GitHub Pages deployment.

Original PNG evidence is kept outside git in the release evidence archive.
