# Nexus Sync & Team Architecture

**Runtime basis:** `v0.1.7-alpha.2.2.1`  
**Architecture baseline:** `v0.1.7-alpha.2.3` WORK03  
**Current status:** Cloud Sync IMPLEMENTED; Team/ACL FOUNDATION.

## Цель

Один Project Studio безопасно существует на нескольких устройствах и, в будущем при явном приглашении, у нескольких участников. Личный проект приватен по умолчанию.

## Security boundary

Клиентский UI не является источником прав. Решение ALLOW/DENY для cloud operation принимает Worker.

Current server chain:

`authenticated subject → project/workspace relation → role → path scope → action → ALLOW/DENY`

Explicit `DENY` has priority over `ALLOW`.

## Roles and scopes

Current role vocabulary:
- owner;
- maintainer;
- developer;
- docs_editor;
- qa;
- viewer.

Special scoped grants:
- `docs_editor` writes `docs/**`;
- `qa` writes `tests/**`.

Additional project policies can allow/deny actions by subject or role on a scope.

## Local-first revision model

Project stores:
- local revision;
- server revision;
- base server revision.

Local and server revision counters are independent.

Existing cloud project update sends `baseRevision`. If it differs from server `current_revision`, Worker returns `409 REVISION_CONFLICT`.

## Current Cloudflare split

- **Worker:** HTTP API, CORS, auth adapter, authorization, revision protocol, project/snapshot/audit orchestration.
- **D1:** account subjects/token hashes, workspaces, projects, memberships, ACL, invites foundation, revision metadata, **project snapshots**, audit.
- **R2:** not required by current runtime.
- **Durable Objects:** not current.
- **Queues:** not current.

Legacy database fields named `r2_key` may contain a D1 locator and are retained for migration compatibility; naming must be cleaned in a later data migration, not silently reinterpreted in docs.

## Current sync protocol

PUSH:
`project + baseRevision → auth → ACL → conflict check → D1 snapshot/revision/audit → new revision`

PULL:
`projectId → auth → view ACL → D1 current snapshot → browser applyCloudProject`

## Audit

Server audit records actor, project, action, scope, revision before/after and metadata including changed files for sync updates.

## Future team layer

D1 already contains membership/invite foundations, but complete invitation/member-management UX is not yet production-complete.

## Evidence

Current cross-device Cloud Sync and revision conflict/recovery are LIVE verified for `v0.1.7-alpha.2.2.1`.
