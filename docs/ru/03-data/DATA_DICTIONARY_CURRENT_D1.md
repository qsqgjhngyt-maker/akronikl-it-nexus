# Data Dictionary — Current Production D1

## account_subjects
Purpose: current Nexus account subject used by token authentication.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | Nexus subject identifier |
| display_name | TEXT | NOT NULL | current display name |
| email | TEXT | nullable | optional current email |
| status | TEXT | NOT NULL, active/disabled | account subject state |
| created_at | TEXT | NOT NULL | ISO-like creation timestamp |
| updated_at | TEXT | NOT NULL | last update timestamp |

## account_tokens
Purpose: long-lived alpha token records. Raw token is not stored.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | token record id |
| subject_id | TEXT | NOT NULL, FK account_subjects | token owner |
| token_hash | TEXT | NOT NULL, UNIQUE | SHA-256 hash of raw token |
| label | TEXT | NOT NULL default device token | human-readable token/device label |
| status | TEXT | active/revoked | revocation state |
| created_at | TEXT | NOT NULL | issued time |
| last_used_at | TEXT | nullable | most recent successful use |

Indexes:
- `idx_account_tokens_subject(subject_id,status)`
- `idx_account_tokens_hash(token_hash,status)`

## workspaces
Purpose: personal/team project namespace.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | workspace id |
| kind | TEXT | personal/team | workspace type |
| name | TEXT | NOT NULL | workspace name |
| owner_subject_id | TEXT | NOT NULL | logical owner subject |
| created_at | TEXT | NOT NULL | creation timestamp |
| updated_at | TEXT | NOT NULL | update timestamp |

## workspace_members
Purpose: workspace membership foundation.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| workspace_id | TEXT | PK part, FK workspaces | workspace |
| subject_id | TEXT | PK part | logical member subject |
| role | TEXT | NOT NULL | role vocabulary |
| status | TEXT | default active | member state |
| invited_by | TEXT | nullable | logical inviter subject |
| joined_at | TEXT | nullable | joined time |
| created_at | TEXT | NOT NULL | membership record creation |

Index:
- `idx_workspace_members_subject(subject_id,status)`

## projects
Purpose: current cloud project metadata/head.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | project id |
| workspace_id | TEXT | NOT NULL, FK workspaces | owning workspace |
| owner_subject_id | TEXT | NOT NULL | logical owner subject |
| title | TEXT | NOT NULL | title |
| language_id | TEXT | NOT NULL | primary language |
| current_revision | INTEGER | NOT NULL default 0 | server-owned head revision |
| latest_r2_key | TEXT | nullable | legacy locator field; D1-only runtime may store D1 locator |
| latest_hash | TEXT | nullable | head snapshot hash |
| created_at | TEXT | NOT NULL | creation time |
| updated_at | TEXT | NOT NULL | update time |

Index:
- `idx_projects_workspace(workspace_id,updated_at DESC)`

## project_members
Purpose: project-specific membership foundation.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| project_id | TEXT | PK part, FK projects | project |
| subject_id | TEXT | PK part | logical member subject |
| role | TEXT | NOT NULL | project role |
| status | TEXT | default active | member state |
| invited_by | TEXT | nullable | logical inviter subject |
| joined_at | TEXT | nullable | joined time |
| created_at | TEXT | NOT NULL | record creation |

Index:
- `idx_project_members_subject(subject_id,status)`

## project_access_policies
Purpose: subject/role scoped ALLOW/DENY rules.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | policy id |
| project_id | TEXT | NOT NULL, FK projects | project |
| subject_id | TEXT | nullable | optional subject target |
| role | TEXT | nullable | optional role target |
| scope | TEXT | NOT NULL default /** | path scope |
| effect | TEXT | allow/deny | rule result |
| actions_json | TEXT | NOT NULL | JSON list/structure of actions |
| created_by | TEXT | NOT NULL | logical creator subject |
| created_at | TEXT | NOT NULL | creation time |

Index:
- `idx_acl_project(project_id)`

## project_revisions
Purpose: immutable revision metadata.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | revision record id |
| project_id | TEXT | NOT NULL, FK projects | project |
| revision | INTEGER | NOT NULL, UNIQUE with project | server revision |
| r2_key | TEXT | NOT NULL | legacy snapshot locator name |
| content_hash | TEXT | nullable | content hash |
| created_by | TEXT | NOT NULL | logical creator |
| created_at | TEXT | NOT NULL | creation timestamp |

Constraints/indexes:
- `UNIQUE(project_id,revision)`
- `idx_revisions_project(project_id,revision DESC)`

## project_snapshots
Purpose: D1-only full JSON project snapshot per cloud revision.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | snapshot id |
| project_id | TEXT | NOT NULL, FK projects | project |
| revision | INTEGER | NOT NULL, UNIQUE with project | cloud revision |
| snapshot_json | TEXT | NOT NULL | serialized project snapshot |
| content_hash | TEXT | nullable | content hash |
| size_bytes | INTEGER | NOT NULL default 0 | serialized size |
| created_by | TEXT | NOT NULL | logical creator |
| created_at | TEXT | NOT NULL | creation time |

Constraints/indexes:
- `UNIQUE(project_id,revision)`
- `idx_project_snapshots_project(project_id,revision DESC)`

Current Worker additionally enforces a 1,500,000-byte maximum snapshot size.

## project_checkpoints
Purpose: server-side checkpoint metadata foundation.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | checkpoint id |
| project_id | TEXT | NOT NULL, FK projects | project |
| revision | INTEGER | NOT NULL | referenced project revision |
| label | TEXT | NOT NULL | checkpoint label |
| created_by | TEXT | NOT NULL | logical creator |
| created_at | TEXT | NOT NULL | creation time |

## project_invites
Purpose: team/project invitation foundation.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | invite id |
| project_id | TEXT | NOT NULL, FK projects | project |
| invited_email | TEXT | nullable | invite email |
| invited_subject_id | TEXT | nullable | known target subject |
| role | TEXT | NOT NULL | offered role |
| scope_json | TEXT | nullable | path/action scope payload |
| status | TEXT | default pending | invite lifecycle state |
| invited_by | TEXT | NOT NULL | logical inviter |
| created_at | TEXT | NOT NULL | issue time |
| accepted_at | TEXT | nullable | acceptance time |

## audit_events
Purpose: append-style cloud project/workspace audit.

| Field | Type | Constraints | Meaning |
|---|---|---|---|
| id | TEXT | PK | event id |
| workspace_id | TEXT | NOT NULL | logical workspace reference |
| project_id | TEXT | nullable | project reference |
| actor_subject_id | TEXT | NOT NULL | logical actor subject |
| action | TEXT | NOT NULL | action id |
| scope | TEXT | NOT NULL default / | affected scope |
| entity_type | TEXT | NOT NULL | entity class |
| entity_id | TEXT | nullable | entity id |
| revision_before | INTEGER | nullable | previous project revision |
| revision_after | INTEGER | nullable | resulting project revision |
| metadata_json | TEXT | NOT NULL default {{}} | additional structured data |
| created_at | TEXT | NOT NULL | event time |

Index:
- `idx_audit_project(project_id,created_at DESC)`

## Current schema debt
1. `latest_r2_key` and `r2_key` are legacy names in a D1-only implementation.
2. subject references are not uniformly FK-constrained.
3. JSON-in-TEXT fields need explicit JSON contract/versioning.
4. timestamp format is convention-based TEXT, not a database temporal type.
5. role/status vocabularies are not centralized in database lookup tables.
