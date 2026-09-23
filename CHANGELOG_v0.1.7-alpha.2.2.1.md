# CHANGELOG v0.1.7-alpha.2.2.1

Base: `v0.1.7-alpha.2.2`

## Fixed
- Bootstrap Cloud Sync transport: no empty `Authorization` on `skipAuth`.
- Worker CORS preflight handles browser-requested headers.
- Service Worker cache revision forces patched Cloud Sync client delivery.

## Changed
- Project snapshots operate in D1-only mode for the current alpha stage.
- Cloudflare deployment package no longer requires R2.

## LIVE verification closed — 2026-09-24
- Bootstrap first account: **PASS**.
- D1 account/token persistence: **PASS**.
- Desktop PUSH rev 1 / rev 2: **PASS**.
- PC → iPhone PULL: **PASS**.
- iPhone → PC PULL: **PASS**.
- Revision conflict rejection: **PASS**.
- Conflict recovery through rev 6: **PASS**.

## Evidence
`docs/evidence/releases/v0.1.7-alpha.2.2.1/` contains selected test screenshots and index.

## Runtime/content
C++ content, Clang/WASM, Project VFS, Code Studio and editor behavior were not changed by this hotfix.
