# Nexus Sync & Team Architecture

**Runtime basis:** `v0.1.7-alpha.2.2.1`  
**Status:** Cloud Sync IMPLEMENTED; Team/ACL FOUNDATION.

Current production split:
- Worker — API/auth/authz/revision/audit orchestration;
- D1 — accounts, workspaces, projects, memberships, ACL/invite foundation, revisions, **snapshots**, audit;
- R2 — not required by current runtime;
- Durable Objects/Queues — not current dependencies.

Existing cloud updates use optimistic concurrency. `baseRevision` must equal server `current_revision`, otherwise the Worker returns `409 REVISION_CONFLICT`.

Explicit DENY has priority over ALLOW. Browser UI is not the authorization authority.
