# Current D1 Indexes and Constraints

## Foreign keys declared in migrations
- `workspace_members.workspace_id → workspaces.id`
- `projects.workspace_id → workspaces.id`
- `project_members.project_id → projects.id`
- `project_access_policies.project_id → projects.id`
- `project_revisions.project_id → projects.id`
- `project_checkpoints.project_id → projects.id`
- `project_invites.project_id → projects.id`
- `account_tokens.subject_id → account_subjects.id`
- `project_snapshots.project_id → projects.id`

## Cascade behavior
All declared project/workspace/account token FKs use `ON DELETE CASCADE`.

## Unique constraints
- `account_tokens.token_hash`
- `project_revisions(project_id,revision)`
- `project_snapshots(project_id,revision)`
- composite PK `workspace_members(workspace_id,subject_id)`
- composite PK `project_members(project_id,subject_id)`

## Check constraints
- `workspaces.kind IN ('personal','team')`
- `project_access_policies.effect IN ('allow','deny')`
- `account_subjects.status IN ('active','disabled')`
- `account_tokens.status IN ('active','revoked')`

## Explicit indexes
- `idx_workspace_members_subject(subject_id,status)`
- `idx_project_members_subject(subject_id,status)`
- `idx_projects_workspace(workspace_id,updated_at DESC)`
- `idx_acl_project(project_id)`
- `idx_revisions_project(project_id,revision DESC)`
- `idx_audit_project(project_id,created_at DESC)`
- `idx_account_tokens_subject(subject_id,status)`
- `idx_account_tokens_hash(token_hash,status)`
- `idx_project_snapshots_project(project_id,revision DESC)`

## WORK05 question
Do not add identity FKs mechanically. Identity lifecycle, deletion/anonymization, invite-by-email and audit retention have different integrity requirements. WORK05 must decide them deliberately.
