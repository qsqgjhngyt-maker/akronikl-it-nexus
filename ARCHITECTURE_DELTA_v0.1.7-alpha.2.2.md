# Architecture Delta — v0.1.7-alpha.2.2

## Cloudflare Sync Transport Preview

This release activates the first real Nexus cross-device transport on top of the v0.1.7-alpha.2.1 Sync & Team data foundation.

### Added
- Nexus Token authentication (`nxk_...`) with SHA-256 token hashes stored in D1.
- One-time first-owner bootstrap protected by encrypted `BOOTSTRAP_SECRET`.
- `/api/v1/me` account verification.
- Real Cloudflare Worker + D1 + R2 push/pull flow.
- Client-side Cloudflare endpoint/token configuration kept per device.
- Account-subject linking for existing personal projects.
- Cloud project list/import for bringing a project onto a second device.
- Explicit local sync states: `pending`, `syncing`, `synced`, `conflict`, `error`.
- HTTP 409 revision conflicts surfaced into the local project sync state.
- Self-contained `dist/worker.js` for dashboard deployment without a local bundler.

### Security invariants
- No production `dev:<subject>` identity is accepted when `ENVIRONMENT=production`.
- Bootstrap closes automatically after the first Nexus account exists.
- R2 keys remain server-derived.
- Project access is checked server-side by authenticated subject + membership + path scope + action.
- Explicit DENY remains stronger than ALLOW.

### Deferred
- Google/OIDC sign-in and session rotation.
- Team invite acceptance UI.
- Background automatic queue flush.
- Three-way conflict merge UI.
