# ER Diagram — Current Production D1 v0.1.7-alpha.2.2.1

**Status: IMPLEMENTED.** Диаграмма построена по migrations `0001`–`0003`.

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

## Важное замечание
`owner_subject_id`, `created_by`, `actor_subject_id`, `invited_by`, `invited_subject_id` являются логическими identity references, но текущие migrations не задают для большинства из них SQL FOREIGN KEY на `account_subjects`.

`latest_r2_key` и `project_revisions.r2_key` — legacy-названия полей. В D1-only runtime они могут содержать locator вида `d1:<project>:<revision>`.
