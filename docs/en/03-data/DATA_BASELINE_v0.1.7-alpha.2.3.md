# AKRONIKL IT NEXUS — Data Baseline

Stage `v0.1.7-alpha.2.3` WORK04, runtime baseline `v0.1.7-alpha.2.2.1`.

Current production data stores:
- browser local course/preferences/identity/project state;
- Cloudflare D1 with 12 production tables for account-token auth, workspaces/projects, revisions/snapshots, ACL/invites and audit.

WORK04 separates exact CURRENT schema from TARGET-DRAFT identity/learning/AI data design.

Key rules:
- server authorization/revision state is server-owned;
- cloud snapshots are explicit sync data, not implicit learning telemetry;
- future AI/learning events require purpose, minimization and retention;
- target schema documents are not deployment migrations.
