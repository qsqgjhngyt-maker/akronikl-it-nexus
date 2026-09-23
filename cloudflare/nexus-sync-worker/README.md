# AKRONIKL IT NEXUS — Cloudflare Sync Worker

Version: `0.1.7-alpha.2.2.1`

This package is the D1-only cross-device Nexus Sync transport used by the current alpha hotfix. Nexus stays local-first while Cloudflare stores account/workspace/project metadata, revisions, audit records and JSON project snapshots in D1. R2 is **not required** for this stage.

## Components
- **Cloudflare Worker** — authenticated API, CORS, ACL checks and revision conflict protection.
- **D1** — accounts, token hashes, workspaces, membership, projects, ACL, revisions, audit and `project_snapshots`.
- **Nexus Token auth** — long random `nxk_...` bearer token; only SHA-256 hashes are stored.
- **One-time bootstrap** — first owner account protected by encrypted Worker secret `BOOTSTRAP_SECRET`.

## D1 migrations
Apply in order:
1. `0001_sync_team_foundation.sql`
2. `0002_nexus_account_tokens.sql`
3. `0003_d1_only_project_snapshots.sql`

## Dashboard deployment
`dist/worker.js` is self-contained. Bind only:
- D1 → `DB`

Text variables:
- `ENVIRONMENT=production`
- `AUTH_MODE=nexus-token`
- `ALLOWED_ORIGIN=https://YOUR-GITHUB-PAGES-HOST`

Encrypted secret:
- `BOOTSTRAP_SECRET=<long random secret>`

No R2 binding is required.

## Security / transport invariants
- Explicit ACL `deny` overrides allow.
- HTTP `409 REVISION_CONFLICT` protects against stale writes.
- `OPTIONS` CORS preflight reflects requested headers for the exact allowed origin.
- Health/bootstrap `skipAuth` calls do not send an empty Authorization header from the client.
- D1 snapshot size is capped at 1,500,000 bytes per revision.
- Bootstrap closes after the first Nexus account exists.

## API
Unauthenticated: `GET /api/v1/health`, `POST /api/v1/bootstrap`.
Authenticated: `GET /api/v1/me`, project list/get/put and audit routes.
