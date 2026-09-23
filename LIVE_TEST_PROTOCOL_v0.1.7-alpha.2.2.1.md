# LIVE TEST PROTOCOL — v0.1.7-alpha.2.2.1

**Current status at package build:** PARTIAL / awaiting bootstrap retest.

## A. Worker production health
Open:
`https://akronikl-nexus-sync.akronikl.workers.dev/api/v1/health`

Expected:
- `ok: true`
- `storage: "d1-only"`
- `authMode: "nexus-token"`
- `d1: true`
- before first account: `bootstrapOpen: true`

## B. GitHub Pages cache refresh
1. Publish PATCH/FULL to GitHub Pages.
2. Wait for Pages deployment to finish.
3. Use `Ctrl+F5` on PC.
4. On PWA/mobile, fully close and reopen; if stale code persists, clear site/PWA cache once.
5. Verify top-right version: `v0.1.7 α2.2.1`.

## C. First-owner bootstrap
1. Project Studio → `Cloud Sync`.
2. Worker URL: `https://akronikl-nexus-sync.akronikl.workers.dev`
3. Leave Nexus Cloud Token empty.
4. Enter `BOOTSTRAP_SECRET` locally. **Do not paste it into chat, GitHub or screenshots.**
5. Account name: `Akronikl`.
6. Continue.

Expected:
- no `Failed to fetch`;
- Worker returns HTTP 201;
- Nexus shows one-time `nxk_...` token;
- token is saved securely by the owner;
- `/api/v1/health` then reports `bootstrapOpen: false`.

## D. Account verification
With saved token, reconnect Cloud Sync. Expected `/api/v1/me` success and account name `Akronikl`.

## E. Project push/pull
1. Open existing test project.
2. Push to cloud.
3. Confirm D1 rows in `projects`, `project_revisions`, `project_snapshots`, `audit_events`.
4. On a second browser/device, configure Worker URL + saved Nexus token.
5. Import/pull project.
6. Verify code, file tree, checkpoints and milestones remain intact.

## F. Conflict test
1. Modify same project on device A and push.
2. Without pulling A's revision, modify stale copy on device B and push.
3. Expected: HTTP 409 `REVISION_CONFLICT`; no silent overwrite.

## Failure capture
If bootstrap still fails, capture DevTools Network entries for `OPTIONS /api/v1/bootstrap` and `POST /api/v1/bootstrap`: status, request headers, response headers and console error. Do not expose secrets/tokens.
