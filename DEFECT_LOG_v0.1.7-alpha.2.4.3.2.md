# DEFECT LOG — v0.1.7-alpha.2.4.3.2

## IDV2-UI-2432-001 — stale top summary after current-session revoke

**Detected:** 2026-09-29 LIVE controlled session lifecycle test  
**Severity:** UX / state projection  
**Data loss:** none  
**Security impact:** none observed  
**Backend impact:** none

### Reproduction
1. Create controlled disposable `nxs_...` server session.
2. Return `IDENTITY_V2_BRIDGE_ENABLED=false`.
3. Account → Devices shows `Server session` and current active session.
4. Click `Завершить эту сессию`.
5. Lower LIVE block immediately shows legacy fallback and 0 active/current sessions.
6. Top `CURRENT DEVICE` / `SESSION MIGRATION` still show `Server session` until page reload.

### Evidence
D1 confirmed the revoke and audit event. Reload confirmed the canonical browser state was already legacy fallback; therefore the defect was limited to stale summary markup.

### Resolution
Added reactive credential-summary projection and regression coverage.

**Candidate status:** FIXED / awaiting post-deploy LIVE confirmation.
