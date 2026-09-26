# ER Diagram — Current Production D1 `v0.1.7-alpha.2.2.1`

**Source of truth:** migrations `0001_sync_team_foundation.sql`, `0002_nexus_account_tokens.sql`, `0003_d1_only_project_snapshots.sql`.

```mermaid
erDiagram
    ACCOUNT_SUBJECTS {
      TEXT id PK
      TEXT display_name
      TEXT email
      TEXT status
      TEXT created_at
      TEXT updated_at
    }

    ACCOUNT_TOKENS {
      TEXT id PK
      TEXT subject_id FK
      TEXT token_hash UK
      TEXT label
      TEXT status
      TEXT created_at
      TEXT last_used_at
    }

    WORKSPACES {
      TEXT id PK
      TEXT kind
      TEXT name
      TEXT owner_subject_id
      TEXT created_at
      TEXT updated_at
    }

    WORKSPACE_MEMBERS {
      TEXT workspace_id PK,FK
      TEXT subject_id PK
      TEXT role
      TEXT status
      TEXT invited_by
      TEXT joined_at
      TEXT created_at
    }

    PROJECTS {
      TEXT id PK
      TEXT workspace_id FK
      TEXT owner_subject_id
      TEXT title
      TEXT language_id
      INTEGER current_revision
      TEXT latest_r2_key
      TEXT latest_hash
      TEXT created_at
      TEXT updated_at
    }

    PROJECT_MEMBERS {
      TEXT project_id PK,FK
      TEXT subject_id PK
      TEXT role
      TEXT status
      TEXT invited_by
      TEXT joined_at
      TEXT created_at
    }

    PROJECT_ACCESS_POLICIES {
      TEXT id PK
      TEXT project_id FK
      TEXT subject_id
      TEXT role
      TEXT scope
      TEXT effect
      TEXT actions_json
      TEXT created_by
      TEXT created_at
    }

    PROJECT_REVISIONS {
      TEXT id PK
      TEXT project_id FK
      INTEGER revision
      TEXT r2_key
      TEXT content_hash
      TEXT created_by
      TEXT created_at
    }

    PROJECT_SNAPSHOTS {
      TEXT id PK
      TEXT project_id FK
      INTEGER revision
      TEXT snapshot_json
      TEXT content_hash
      INTEGER size_bytes
      TEXT created_by
      TEXT created_at
    }

    PROJECT_CHECKPOINTS {
      TEXT id PK
      TEXT project_id FK
      INTEGER revision
      TEXT label
      TEXT created_by
      TEXT created_at
    }

    PROJECT_INVITES {
      TEXT id PK
      TEXT project_id FK
      TEXT invited_email
      TEXT invited_subject_id
      TEXT role
      TEXT scope_json
      TEXT status
      TEXT invited_by
      TEXT created_at
      TEXT accepted_at
    }

    AUDIT_EVENTS {
      TEXT id PK
      TEXT workspace_id
      TEXT project_id
      TEXT actor_subject_id
      TEXT action
      TEXT scope
      TEXT entity_type
      TEXT entity_id
      INTEGER revision_before
      INTEGER revision_after
      TEXT metadata_json
      TEXT created_at
    }

    ACCOUNT_SUBJECTS ||--o{ ACCOUNT_TOKENS : "declared FK"
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : "declared FK"
    WORKSPACES ||--o{ PROJECTS : "declared FK"
    PROJECTS ||--o{ PROJECT_MEMBERS : "declared FK"
    PROJECTS ||--o{ PROJECT_ACCESS_POLICIES : "declared FK"
    PROJECTS ||--o{ PROJECT_REVISIONS : "declared FK"
    PROJECTS ||--o{ PROJECT_SNAPSHOTS : "declared FK"
    PROJECTS ||--o{ PROJECT_CHECKPOINTS : "declared FK"
    PROJECTS ||--o{ PROJECT_INVITES : "declared FK"
```

## Logical references not declared as SQL FK

The following fields currently behave as logical subject references but are not consistently declared as FK:

- `workspaces.owner_subject_id`
- `workspace_members.subject_id`
- `workspace_members.invited_by`
- `projects.owner_subject_id`
- `project_members.subject_id`
- `project_members.invited_by`
- `project_access_policies.subject_id`
- `project_access_policies.created_by`
- `project_revisions.created_by`
- `project_snapshots.created_by`
- `project_checkpoints.created_by`
- `project_invites.invited_subject_id`
- `project_invites.invited_by`
- `audit_events.actor_subject_id`

WORK05 must decide which references become physical FK constraints and which remain application-owned identifiers.
