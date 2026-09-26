# Data Flow — Current `v0.1.7-alpha.2.2.1`

Primary current flows:
- learning actions ↔ browser course state;
- source/project actions ↔ browser project state;
- runtime request → browser/WASM runtime → diagnostics/stdout/stderr;
- explicit PUSH/PULL ↔ Worker ↔ D1;
- Bearer Nexus token → Worker authentication.

Current cloud data includes account subject/token hash, project/workspace metadata, revisions, snapshots, ACL foundation and audit.

Full learning telemetry is not currently uploaded as an AI dataset.
