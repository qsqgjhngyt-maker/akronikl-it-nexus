# AKRONIKL IT NEXUS v0.1.7-alpha.2.4.2 — Identity v2 Session Foundation LIVE PASS

The first real server-side Identity v2 session lifecycle is now production-verified.

## LIVE PASS

- D1 migration 0004: PASS
- 3 Identity tables + 5 indexes: PASS
- production Worker: PASS
- `/api/v1/health`: PASS
- `/api/v2/auth/capabilities`: PASS
- legacy Cloud Sync PULL/PUSH: PASS
- cloud revision 6 → 7: PASS
- bridge isolation when disabled: PASS
- controlled `nxk_...` → `nxs_...` bridge: PASS
- session authenticate/list: PASS
- server-side revoke: PASS
- revoked credential → `401 INVALID_SESSION`: PASS
- D1 revoked state: PASS
- security audit: PASS
- bridge returned to disabled: PASS

## Security

Session secrets are hash-only at rest. Raw `nxk_...`, `nxs_...` and `BOOTSTRAP_SECRET` are not included in the repository or release evidence.

Final production state keeps:

```text
IDENTITY_V2_BRIDGE_ENABLED=false
cookieSessionEnabled=false
```

## Compatibility

The new Identity foundation is additive. Existing Project Studio Cloud Sync remained operational on the new Worker and advanced cloud revision from 6 to 7.

## What is still next

This is not federated public login yet. Future increments will add first-party HttpOnly sessions, devices/session UI migration, Yandex/Google/Apple/Phone/Passkey and MFA/recovery.

## Evidence

Optimized evidence is committed under:

`docs/evidence/releases/v0.1.7-alpha.2.4.2/`

Original screenshots are attached to the GitHub Release as a separate archive.
