# Architecture Delta — v0.1.7-alpha.2.2.1

## Cloud Sync Bootstrap Transport Hotfix — D1-only

### Decision
For the current alpha stage, immutable project snapshots move from mandatory R2 storage to D1 `project_snapshots`. This removes the R2 billing/subscription dependency while preserving the existing project/revision metadata model.

### Transport changes
- Browser health/bootstrap calls made with `skipAuth` omit `Authorization` entirely instead of sending an empty header.
- Worker `OPTIONS` responses reflect `Access-Control-Request-Headers` when present, while retaining a safe fallback list.
- `ALLOWED_ORIGIN` remains exact-origin constrained.

### Storage changes
- New table `project_snapshots` stores `snapshot_json`, content hash, size, creator and revision.
- Snapshot limit is currently 1,500,000 bytes per project revision to stay below D1 per-value constraints with headroom.
- Legacy `latest_r2_key` / `r2_key` columns are retained for schema compatibility and receive an internal `d1:<project>:<revision>` locator. No R2 binding is required.

### Reproducibility
The repository Worker source, dashboard `dist/worker.js`, Wrangler example, setup schema and migrations are aligned to D1-only operation.

### Not changed
- Project Studio local-first model.
- ACL roles, path scopes and explicit DENY precedence.
- Audit model.
- Clang/WASM runtime, Code Studio, course content and stable C++ IDs.

### Deferred
- Google/OIDC sign-in and session rotation.
- Team invitation acceptance UI.
- Background queue flush and three-way merge.
- Large/binary artifact storage (`.exe`, ML model files, build artifacts) outside D1.
