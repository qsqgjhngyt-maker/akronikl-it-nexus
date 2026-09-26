# Schema Versioning and Migration Policy

- D1 migrations are append-only and ordered.
- Do not rewrite applied production migration semantics.
- Browser JSON data carries schemaVersion and deterministic idempotent migration.
- Project snapshot schema needs explicit versioning before breaking changes.
- Legacy `r2_key` should be migrated through a compatibility window, not destructively renamed.
