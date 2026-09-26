# Current Project Snapshot Contract

Cloud D1 `project_snapshots.snapshot_json` stores the serialized Project Studio project object.

Important logical sections currently present in the local project model:

```text
project
├── id
├── schemaVersion = 2
├── title
├── languageId
├── description
├── origin
├── manifest
│   ├── schemaVersion
│   ├── entryFile
│   ├── sourceRoots
│   ├── includeRoots
│   ├── testRoots
│   ├── build
│   ├── sync
│   └── release
├── workspace
│   ├── languageId
│   ├── entryFile
│   ├── activeFile
│   ├── revision
│   └── files[]
├── progress
├── checkpoints[]
├── access
├── sync
├── release
├── createdAt
└── updatedAt
```

## Current contract risks

1. Full snapshot is a broad aggregate and can evolve independently from D1 table schema.
2. `snapshot_json` has no explicit standalone snapshot schema version column.
3. JSON schema validation is implemented mainly in application normalization rather than database constraints.
4. Snapshot migration strategy must be formalized before large-scale user data exists.

## Target rule

Any future breaking Project Snapshot change must define:
- old schema version;
- new schema version;
- deterministic migration;
- idempotency;
- rollback/read compatibility;
- regression fixture.
