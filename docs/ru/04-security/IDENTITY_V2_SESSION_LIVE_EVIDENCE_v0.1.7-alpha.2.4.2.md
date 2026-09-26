# Identity v2 Session Security — LIVE Evidence

**Release:** v0.1.7-alpha.2.4.2  
**Date:** 2026-09-26

## Verified controls

- raw `nxs_...` session credential is not stored in D1;
- D1 stores `secret_hash`;
- controlled session is revocable server-side;
- revoked credential immediately fails with `401 INVALID_SESSION`;
- session is linked to device;
- idle/absolute expiry policy exposed as 60 min / 8 h;
- bridge is feature-flag gated;
- legacy bridge was returned to `false` after testing;
- security audit records create/revoke events;
- temporary browser test credential was removed from `sessionStorage`;
- raw `nxk_...`, `nxs_...` and `BOOTSTRAP_SECRET` are excluded from release evidence.

## Security events observed
- `auth.session.bridge_created` → success
- `auth.session.revoked` → success

## Boundary
This does not yet equal public production login. Browser-readable legacy token remains technical debt until first-party HttpOnly session deployment.
