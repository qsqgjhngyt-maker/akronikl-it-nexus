# Architecture Delta v0.1.7-alpha.2.1

## Project identity and persistence

Project storage remains under the backward-compatible key `akronikl:it-nexus:projects:v1`, while the internal database schema advances to v2. Existing local projects are upgraded in place with a private access model and preserved local revision.

A separate persistent local identity supplies:
- `deviceId`;
- `localPrincipalId`;
- `personalWorkspaceId`;
- future `accountSubjectId` link.

## Access model

Each project has `access`:
- owner;
- workspace;
- members + roles;
- path-scoped allow/deny policies.

Permission evaluation uses `role + action + project path`. Explicit `deny` wins over every role/policy `allow`.

Initial roles:
- owner;
- maintainer;
- developer;
- docs_editor (write scope: `docs/**`);
- qa (write scope: `tests/**`);
- viewer.

## Sync model

Project sync state is local-first and separates:
- local revision;
- cloud/server revision;
- base server revision;
- provider;
- conflict state;
- last local/synced timestamps.

Cloud-mode local edits are coalesced per project in a sync queue instead of adding one queue item per keystroke.

## Cloudflare backend kit

The repository now includes `cloudflare/nexus-sync-worker/`:
- Worker API scaffold;
- D1 migration;
- R2 snapshot storage;
- revision conflict detection;
- server-side ACL evaluation;
- audit append path.

The Worker is safe-by-default: `AUTH_MODE=disabled`. A development mode exists only for local smoke testing and is rejected when `ENVIRONMENT=production`.

Durable Objects and Queues remain deliberately outside this first data foundation. They are reserved for real-time collaboration, build jobs and asynchronous workflows after the base sync protocol is live.
