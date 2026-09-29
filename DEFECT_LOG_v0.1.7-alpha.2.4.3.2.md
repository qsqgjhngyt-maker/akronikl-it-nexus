# DEFECT LOG — v0.1.7-alpha.2.4.3.2

## IDV2-UI-2432-001 — stale top summary after current-session revoke

**Detected:** 2026-09-29 controlled LIVE session lifecycle  
**Severity:** UX / state projection  
**Data loss:** none  
**Security impact:** none observed  
**Backend impact:** none  
**Final status:** RESOLVED / LIVE CONFIRMED

### Reproduction
1. Create controlled disposable `nxs_...` server session.
2. Return `IDENTITY_V2_BRIDGE_ENABLED=false`.
3. Account → Devices shows `Server session`.
4. Revoke current disposable session through UI.
5. Before the fix, the live list switched to legacy fallback but the two top summary cards stayed stale until F5.

### Root cause
The live Devices/Sessions block refreshed canonical credential state, while the already-rendered `CURRENT DEVICE` and `SESSION MIGRATION` markup was not re-projected after the revoke/fallback transition.

### Resolution
The Account Center now re-projects Identity transport and Session Migration summary from the canonical credential state during Identity refresh.

### LIVE confirmation
On `v0.1.7-alpha.2.4.3.2`:
- current disposable session was revoked through UI;
- `sessionStorage` server credential was cleared;
- `Identity transport` immediately changed to `Legacy credential + server API`;
- Session Migration immediately changed to legacy fallback;
- active/current session counts immediately became zero;
- **no page reload was required**.

### Related lifecycle proof
The same controlled test cycle also confirmed:
- server session creation/authentication;
- bridge disabled before normal use;
- D1 session revoke;
- security audit;
- disposable device revoke;
- working registered device remained active.
