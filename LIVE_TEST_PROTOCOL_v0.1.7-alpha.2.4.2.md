# LIVE TEST PROTOCOL — v0.1.7-alpha.2.4.2

**Execution date:** 2026-09-26  
**Core result:** FULL LIVE PASS

## A. D1 migration

Result:
- `account_devices`: PASS
- `account_sessions`: PASS
- `identity_security_events`: PASS
- 5 canonical indexes: PASS
- initial counts: `0 / 0 / 0`

Cloudflare Dashboard deployment note:
migration statements were executed individually; final verification uses a Dashboard-safe single SELECT.

## B. Production Worker

`/api/v1/health`:
- version `0.1.7-alpha.2.4.2-identity-foundation`: PASS
- D1: PASS
- `identityV2SessionFoundation=true`: PASS
- `identityV2BridgeEnabled=false`: PASS

`/api/v2/auth/capabilities`:
- `sessionFoundation=true`: PASS
- `bridgeEnabled=false`: PASS
- `legacyTokenCompatible=true`: PASS
- `cookieSessionEnabled=false`: PASS
- idle 60 / absolute 8: PASS

## C. Legacy Cloud Sync regression

Before session bridge enable:
- PULL existing cloud project at rev 6: PASS
- PUSH: PASS
- cloud revision 6 → 7: PASS
- no Identity rows created while bridge false: PASS (`0 / 0 / 0`)

## D. Controlled session lifecycle

Temporary:
`IDENTITY_V2_BRIDGE_ENABLED=true`

Verified:
1. bridge create from current `nxk_...`: PASS
2. new `nxs_...` authentication: PASS
3. `authMode=nexus-session`: PASS
4. device linked: PASS
5. session list/current: PASS
6. revoke current session: PASS
7. same credential after revoke: `401 INVALID_SESSION`: PASS
8. temporary browser credential removed: PASS

D1 result:
- devices: 1
- sessions: 1
- active: 0
- revoked: 1
- security events: 2

Audit:
- `auth.session.bridge_created` → success
- `auth.session.revoked` → success

## E. Final production state

Bridge returned to:
`IDENTITY_V2_BRIDGE_ENABLED=false`

Final capabilities:
- `sessionFoundation=true`
- `bridgeEnabled=false`
- `legacyTokenCompatible=true`
- `cookieSessionEnabled=false`

## F. Frontend overlay post-publish smoke

After GitHub overlay deployment:
1. confirm badge `v0.1.7 α2.4.2`;
2. Account → Security/Devices loads;
3. server foundation reports available;
4. migration bridge reports disabled;
5. Project Studio opens;
6. existing Cloud Sync still shows account/project state.

This final frontend smoke is the only post-package publication check.
