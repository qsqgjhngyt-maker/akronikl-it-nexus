# CHANGELOG — v0.1.7-alpha.2.2

- Added real Cloudflare Sync transport preview.
- Added Nexus Token account authentication backed by D1 token hashes.
- Added one-time first-owner bootstrap protected by `BOOTSTRAP_SECRET`.
- Added `/api/v1/me`, real push/pull and cloud project listing/import.
- Added Project Studio controls for Cloud Sync setup, enabling cloud mode, PUSH, PULL and import from cloud.
- Added account linking for previously local-only personal projects.
- Added revision-conflict state instead of silent cloud overwrite.
- Added self-contained dashboard Worker build and second D1 migration for accounts/tokens.
- Existing C++ content, runtime routing, Project VFS, checkpoints, session resume and editor viewport/gutter behavior remain unchanged.
