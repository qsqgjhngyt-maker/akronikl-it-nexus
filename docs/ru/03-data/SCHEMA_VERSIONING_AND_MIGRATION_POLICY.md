# Schema Versioning & Migration Policy

## 1. Database migrations
D1 changes use ordered migrations:

```text
0001_...
0002_...
0003_...
```

Future production changes continue monotonically.

## 2. Never edit applied migration semantics
If a deployed table needs correction, add a new migration.

## 3. Migration package must contain
- migration SQL;
- preconditions;
- expected schema after;
- rollback/mitigation note;
- compatibility statement;
- test fixture;
- migration verification query;
- release/ADR links.

## 4. Browser data
Browser JSON models must carry `schemaVersion`.

Migration must be:
- deterministic;
- idempotent;
- tolerant of missing optional fields;
- tested against representative old fixtures.

## 5. Project snapshots
Project snapshot schema version must become independently explicit before breaking changes.

## 6. API compatibility
Data migrations do not automatically justify breaking API changes.
Server should support a compatibility window where practical.

## 7. Legacy `r2_key`
Current field naming is technical debt.

Preferred future migration sequence:
1. introduce storage-neutral locator field;
2. backfill from legacy fields;
3. dual-read during compatibility window;
4. migrate Worker;
5. remove/retire legacy name only in a later migration.

No destructive rename is performed in WORK04.
