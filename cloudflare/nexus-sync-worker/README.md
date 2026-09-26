# AKRONIKL IT NEXUS — Cloudflare Sync / Identity Worker

Version: `0.1.7-alpha.2.4.2-identity-foundation`

This package keeps the proven D1-only Cloud Sync API and adds the first **Identity v2 server/session foundation** without breaking legacy `nxk_...` authentication.

## Current production-compatible behavior
- D1-only project snapshots;
- Nexus token auth remains valid;
- project ACL and optimistic concurrency remain unchanged;
- current GitHub Pages client can continue using Cloud Sync.

## New Identity v2 foundation
Migration `0004_identity_v2_session_foundation.sql` adds:
- `account_devices`;
- `account_sessions`;
- `identity_security_events`.

New API foundation:
- `GET /api/v2/auth/capabilities`
- `POST /api/v2/session/bridge`
- `GET /api/v2/session`
- `DELETE /api/v2/session`
- `GET /api/v2/sessions`
- `DELETE /api/v2/sessions/:id`
- `POST /api/v2/sessions/revoke-all`
- `GET /api/v2/devices`
- `DELETE /api/v2/devices/:id`

`nxs_...` session secrets are stored in D1 only as SHA-256 hashes. Raw session tokens are returned once by the migration bridge.

## Important security boundary
This is **not yet the final public browser session model**.

The current `github.io ↔ workers.dev` deployment does not switch to long-lived cookie sessions in this release. Public Identity v2 still requires the first-party/same-site deployment design from WORK05.

## Migration bridge
Text variable:

```text
IDENTITY_V2_BRIDGE_ENABLED=false
```

Default recommendation: keep it `false` until migration testing is intentionally performed.

When enabled, an authenticated legacy Nexus token can create a short-lived server session through `/api/v2/session/bridge`.

Session defaults:
- idle timeout: 60 minutes;
- absolute timeout: 8 hours.

## D1 migrations
Apply in order:
1. `0001_sync_team_foundation.sql`
2. `0002_nexus_account_tokens.sql`
3. `0003_d1_only_project_snapshots.sql`
4. `0004_identity_v2_session_foundation.sql`

## Dashboard deployment
`dist/worker.js` is self-contained.

Bindings:
- D1 → `DB`

Text variables:
- `ENVIRONMENT=production`
- `AUTH_MODE=nexus-token`
- `ALLOWED_ORIGIN=https://YOUR-GITHUB-PAGES-HOST`
- `IDENTITY_V2_BRIDGE_ENABLED=false`

Encrypted secret:
- `BOOTSTRAP_SECRET=<existing secret>`

## Deployment order
1. Apply D1 migration 0004.
2. Deploy the new Worker.
3. Verify `/api/v2/auth/capabilities`.
4. Deploy frontend overlay.
5. Perform legacy Cloud Sync regression.
6. Optionally enable bridge for controlled session lifecycle testing.

## Existing API
Existing `/api/v1/*` routes remain backward compatible.

## Retained Cloud Sync security invariants
- Explicit ACL `deny` overrides allow.
- HTTP `409 REVISION_CONFLICT` protects against stale writes.
- Bootstrap closes after the first Nexus account exists.
- D1 remains the project snapshot storage for this stage.
