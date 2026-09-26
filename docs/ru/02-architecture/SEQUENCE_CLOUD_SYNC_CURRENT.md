# Sequence — Current Cloud Sync PUSH/PULL

**Status:** IMPLEMENTED and LIVE verified.

## PUSH

```mermaid
sequenceDiagram
    actor U as User
    participant P as Project Studio
    participant S as Cloud Sync
    participant W as Worker
    participant D as D1

    U->>P: PUSH
    P->>S: pushProjectNow(projectId)
    S->>P: read local project + baseServerRevision
    S->>W: PUT /api/v1/projects/:id
    Note over S,W: project + baseRevision + Bearer token
    W->>W: authenticate
    W->>D: load project/current revision
    W->>W: ACL + baseRevision check
    W->>W: hash/size/change analysis
    W->>D: write project metadata + revision + snapshot + audit
    D-->>W: committed
    W-->>S: revision/hash/updatedAt
    S->>P: set serverRevision/baseServerRevision
    S->>P: append local sync.pushed audit
```

## PULL

```mermaid
sequenceDiagram
    actor U as User
    participant P as Project Studio
    participant S as Cloud Sync
    participant W as Worker
    participant D as D1

    U->>P: PULL
    P->>S: pullProjectNow(projectId)
    S->>W: GET /api/v1/projects/:id
    W->>W: authenticate
    W->>D: load project + access
    W->>W: require view
    W->>D: load current D1 snapshot
    D-->>W: project snapshot
    W-->>S: project + meta.revision/hash
    S->>P: applyCloudProject(...)
    S->>P: set base/server revision
    S->>P: append sync.pulled audit
```

## Invariants

- PULL does not infer ownership from client UI.
- Existing project PUSH must match server `current_revision`.
- Snapshot size must be ≤ 1,500,000 bytes.
- Server authorization is checked before applying changes.
