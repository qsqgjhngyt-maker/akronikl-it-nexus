# AKRONIKL IT NEXUS — Cloudflare Sync Worker

Version: `0.1.7-alpha.2.2`

This package is the first real cross-device Nexus Sync transport. It is intentionally local-first: projects remain usable without the cloud, while Cloudflare stores authoritative cloud revisions and immutable project snapshots.

## Components

- **Cloudflare Worker** — authenticated API, CORS, ACL checks, revision conflict protection.
- **D1** — Nexus accounts, account token hashes, workspaces, members, projects, ACL, revisions, invites and audit metadata.
- **R2** — immutable JSON project snapshots by workspace/project/revision.
- **Nexus Token auth** — long random `nxk_...` bearer token. D1 stores only the SHA-256 token hash.
- **One-time bootstrap** — the first owner account can be created with a Worker secret `BOOTSTRAP_SECRET`. Bootstrap automatically closes after the first account exists.

## Safety model

- `AUTH_MODE=nexus-token` is required for the real transport preview.
- `BOOTSTRAP_SECRET` is a Worker **secret**, never a public `vars` value.
- The browser never chooses an R2 object key; the Worker constructs it from verified workspace/project/revision data.
- Every existing project write requires membership/ACL checks and an exact `baseRevision`.
- A stale write returns HTTP `409 REVISION_CONFLICT`; cloud state is not silently overwritten.
- Explicit ACL `deny` has priority over role or explicit `allow`.
- `ALLOWED_ORIGIN` should be the exact GitHub Pages origin, for example `https://example.github.io`.

## D1 migrations

Apply both migrations, in order:

1. `migrations/0001_sync_team_foundation.sql`
2. `migrations/0002_nexus_account_tokens.sql`

With Wrangler, Cloudflare D1 migrations can be applied with:

```bash
npx wrangler d1 migrations apply akronikl-nexus-sync --remote
```

## Dashboard deployment

For a no-CLI setup, `dist/worker.js` is a self-contained Worker module suitable for the Cloudflare dashboard editor. Bind:

- D1 as `DB`
- R2 as `SNAPSHOTS`

Set text variables:

- `ENVIRONMENT=production`
- `AUTH_MODE=nexus-token`
- `ALLOWED_ORIGIN=https://YOUR-GITHUB-PAGES-HOST`

Set encrypted secret:

- `BOOTSTRAP_SECRET=<your long random secret>`

After the Worker is deployed, open Nexus Project Studio → **Cloud Sync**. For the first account, leave the token field empty and enter the bootstrap secret. Nexus will call `/api/v1/bootstrap`, receive the first owner token once, save it on that device, and display it for you to copy to the second device.

## API

Unauthenticated:

- `GET /api/v1/health`
- `POST /api/v1/bootstrap` — only while no Nexus account exists; requires `x-nexus-bootstrap-secret`

Authenticated (`Authorization: Bearer nxk_...`):

- `GET /api/v1/me`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `PUT /api/v1/projects/:id`
- `GET /api/v1/projects/:id/audit`

## Current scope

This is the first transport preview, not the final account UX. It is designed to validate real PC ↔ Cloudflare ↔ phone sync before adding Google/OIDC sign-in, invitations and full Team management screens.
