# DEFECT / UX LOG — v0.1.7-alpha.2.4.3.1

## UX-IA-001 — Ambiguous Cloud Sync ownership

**Observed on:** Android / Samsung Browser during `v0.1.7-alpha.2.4.3` LIVE smoke.  
**Previous UI:** Projects dashboard contained both `Cloud Sync` and `↓ Из облака`.

### Observation
`Cloud Sync` opened account/bootstrap configuration while the adjacent `↓ Из облака` performed remote project discovery/import. This made a healthy Cloud Sync implementation look like a routing defect during testing.

### Classification
UX / Information Architecture improvement.  
Not a backend defect.  
Data loss: none observed.

### Resolution in 2.4.3.1
- remove account setup button from Projects dashboard;
- move cloud connection/configuration to Account Center;
- route project settings to Account Center;
- route unconfigured import to Account Center after explanation.

### Post-deploy verification
PENDING.

## LIVE-2431-001 — Nexus Cloud tab rendered Security content

**Status:** FIXED IN CANDIDATE BEFORE RELEASE  
**Detected:** desktop LIVE smoke  
**Impact:** frontend content routing only; no Cloud Sync/backend/data impact.

Observed:
- `Nexus Cloud` tab became active;
- Security content rendered instead of the existing cloud configuration block.

Root cause:
- the new `cloud` tab/content was added, but the final `content` selector did not include `current==='cloud'`.

Fix:
- added explicit `cloud → cloud` mapping;
- added automated regression test `tests/account-cloud-tab-routing-check.mjs`.

Expected after fix:
- local-only → `Подключить Nexus Cloud`;
- cloud-linked → `Изменить подключение` + `Отключить на этом устройстве`.
