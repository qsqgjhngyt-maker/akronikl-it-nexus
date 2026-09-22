# RELEASE v0.1.7-alpha.2.1

**Nexus Sync & Team Data Foundation**

This release starts the `v0.1.7-alpha.2` line without activating public cloud sync yet.

What is now executable in the client:
- persistent local device/principal identity;
- automatic migration of existing Project Studio records to project DB schema v2;
- private project ownership and personal workspace identity;
- role + path-scoped project ACL model;
- explicit `deny` precedence over `allow`;
- local audit foundation for project lifecycle/checkpoints/milestones;
- local-first sync metadata and a coalescing sync queue when cloud mode is enabled;
- a provider contract plus Cloudflare provider adapter;
- Project Studio UI panels for ACCESS / SYNC / AUDIT.

What is bundled for the next cloud step:
- safe-by-default Cloudflare Worker scaffold;
- D1 schema for workspaces, members, projects, scoped ACL, invites, revisions, checkpoints and audit events;
- R2 immutable revision snapshots with server-generated object keys;
- revision-conflict protection (HTTP 409 instead of silent overwrite);
- server-side permission checks for changed file paths;
- server-side audit metadata including changed file paths.

Production account authentication is deliberately **not enabled** in this release. Protected Worker routes remain closed until a verified account/auth adapter is connected.
