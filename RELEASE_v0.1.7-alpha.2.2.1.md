# AKRONIKL IT NEXUS v0.1.7-alpha.2.2.1

**Release name:** Cloud Sync Bootstrap Transport Hotfix — D1-only

## Purpose
This hotfix packages the Cloud Sync corrections made during the first real GitHub Pages → Cloudflare Worker → D1 bootstrap attempt. It keeps the application local-first and does not change C++ course content, Clang/WASM, Project VFS, editor behavior, milestones or checkpoints.

## Included fixes
- Cloudflare Worker CORS preflight reflects the browser-requested `Access-Control-Request-Headers`.
- Client `sync/cloudflare-provider.js` no longer sends an empty `Authorization` header when `skipAuth=true` (health/bootstrap).
- Snapshot persistence is D1-only; R2 is not required for this stage.
- `project_snapshots` D1 migration is included for reproducible setup.
- Service Worker cache keys and executable release version are bumped to force delivery of the patched client.
- Dashboard Worker source/dist are aligned with the deployed D1-only Worker implementation.

## Observed LIVE status before this package
- Production `/api/v1/health`: **PASS**.
- D1 binding: **PASS**.
- `AUTH_MODE=nexus-token`: **PASS**.
- `bootstrapOpen=true`: **PASS**.
- First-owner bootstrap from GitHub Pages: **FAIL / `net::ERR_CONNECTION_RESET`** before the client hotfix.
- This release therefore ships with status **PARTIAL — LIVE bootstrap retest required**.

## Security invariants
- `BOOTSTRAP_SECRET` remains a Cloudflare encrypted Worker secret and is never committed to GitHub.
- Nexus account tokens are generated as `nxk_...`; D1 stores only their SHA-256 hashes.
- Bootstrap closes after the first account exists.
- Production `dev:<subject>` authentication remains disabled.
- Existing project writes remain guarded by membership/ACL and revision conflict protection.
