# CHANGELOG v0.1.7-alpha.2.1

## Added
- Persistent local Nexus identity (`deviceId`, local principal, personal workspace).
- Project DB schema v2 with automatic backward migration.
- Project ownership, memberships, roles and path-scoped ACL.
- Explicit DENY precedence.
- Local audit foundation.
- Sync provider contract, coalescing queue and Cloudflare client adapter.
- Project Studio ACCESS / SYNC / AUDIT panels.
- Cloudflare Worker + D1/R2 backend kit.
- D1 schema for workspaces, project members, ACL, invites, revisions, checkpoints and audit.
- Server-generated R2 revision keys and server-side revision conflict checks.
- File-path-aware authorization before accepted project sync updates.

## Preserved
- Project Studio VFS and multi-file Clang/WASM build.
- Checkpoints and milestone persistence.
- Code Studio editor viewport/gutter fix from v0.1.7-alpha.1.3.2.
- Session-only resume.
- 40 stable C++ lesson IDs and `cpp_programming_pdf_course_v1` legacy progress contract.

## Not enabled yet
- Production user sign-in/account linking.
- Cross-device push/pull in the public UI.
- Invitations UI and live team collaboration.
- Durable Objects / Queues based realtime or build orchestration.
