# CHANGELOG v0.1.7-alpha.2.2.1

Base: `v0.1.7-alpha.2.2`

## Fixed
- Cloud bootstrap request no longer emits an empty `Authorization` header when authentication is intentionally skipped.
- Worker preflight CORS now accepts the browser-requested header set.
- Service Worker cache revision bumped to prevent stale Cloud Sync client code after GitHub Pages deployment.

## Changed
- Cloud project snapshot persistence is now D1-only for the alpha transport stage.
- Cloudflare deployment package no longer requires an R2 binding.
- Worker/dashboard kit and migration set are aligned with the actual deployed D1-only backend.

## Diagnostics retained
Before the client hotfix, the real bootstrap attempt reached `POST /api/v1/bootstrap` but Chromium reported `net::ERR_CONNECTION_RESET` / `Failed to fetch`. Production health remained available and returned `bootstrapOpen=true`. This observation is retained as part of the release history and must be closed by LIVE retest.

## Content/runtime
No changes to C++ educational content, Clang/WASM, Project VFS, editor/gutter, checkpoints or milestones.
