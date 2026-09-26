# RELEASE v0.1.7-alpha.2.4.2

**Name:** Identity v2 Session Foundation  
**Date:** 2026-09-26  
**Status:** CORE SESSION LIFECYCLE — FULL LIVE PASS

## Scope

This release introduces the first production-deployed Identity v2 server/session foundation while preserving the existing `nexus-token` Cloud Sync path.

Implemented:
- D1 `account_devices`;
- D1 `account_sessions`;
- D1 `identity_security_events`;
- hash-only session secret storage;
- `nxs_...` session credential family;
- idle expiry: 60 minutes;
- absolute expiry: 8 hours;
- server-side session list;
- session revoke;
- revoke-all/device foundation;
- security audit events;
- gated legacy-token migration bridge;
- public capability endpoint;
- Account Center server-foundation status.

## LIVE production evidence

Verified in production on 2026-09-26:
- D1 migration 0004: PASS;
- 3 tables + 5 indexes: PASS;
- Worker health: PASS;
- capabilities with bridge false: PASS;
- legacy Cloud Sync PULL: PASS;
- legacy Cloud Sync PUSH: PASS;
- cloud revision 6 → 7: PASS;
- bridge isolation while false: PASS;
- controlled bridge enable: PASS;
- `nxs_...` create/auth: PASS;
- list/current session: PASS;
- server-side revoke: PASS;
- same revoked credential → `401 INVALID_SESSION`: PASS;
- D1 session status `revoked`: PASS;
- audit `auth.session.bridge_created`: PASS;
- audit `auth.session.revoked`: PASS;
- temporary browser session removed: PASS;
- bridge restored to false: PASS.

## Production-safe final state

```text
IDENTITY_V2_BRIDGE_ENABLED=false
cookieSessionEnabled=false
firstPartyDeploymentRequired=true
```

The bridge was enabled only for the controlled migration test and was disabled again afterwards.

## Security boundary

This release is **not** public Yandex/Google/Apple/Phone/Passkey login.

Normal browser sign-in still uses the legacy Cloud configuration. Public Identity v2 requires the later first-party HttpOnly session deployment.

## Frontend publication

The GitHub overlay bumps the app to `v0.1.7-alpha.2.4.2` and surfaces Identity v2 server status in Account Center.

Automated frontend regression is PASS. After publishing the overlay, perform the short visual smoke described in `LIVE_TEST_PROTOCOL_v0.1.7-alpha.2.4.2.md` before creating/marking the GitHub Release final.
