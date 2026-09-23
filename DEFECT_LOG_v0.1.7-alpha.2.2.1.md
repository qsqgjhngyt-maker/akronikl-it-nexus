# DEFECT LOG — v0.1.7-alpha.2.2.1

## D-001 — Cloud bootstrap `ERR_CONNECTION_RESET`
- **Observed:** GitHub Pages → `POST /api/v1/bootstrap` resulted in `Failed to fetch` / `net::ERR_CONNECTION_RESET`.
- **Backend health during defect:** Worker health remained available; D1 binding healthy.
- **Fix set:** dynamic CORS requested-header handling + omit empty `Authorization` on `skipAuth` + cache refresh/version bump.
- **Verification:** first account created successfully; bootstrap closed; subsequent authenticated push/pull successful.
- **Status:** CLOSED.
- **Root-cause note:** combined transport hotfix resolved the issue; one individual change was not isolated as the sole cause.

## D-002 — Potential lost update between devices
- **Risk:** two devices start from same cloud revision; one writes first, second could overwrite it.
- **Protection:** server compares `baseRevision` to current cloud revision.
- **LIVE test:** stale desktop PUSH rejected after mobile advance.
- **Recovery:** desktop PULL rev 5 → new edit → PUSH rev 6.
- **Status:** RISK CONTROL VERIFIED / PASS.
