# Current D1 ERD

Current production tables:
`account_subjects`, `account_tokens`, `workspaces`, `workspace_members`, `projects`, `project_members`, `project_access_policies`, `project_revisions`, `project_snapshots`, `project_checkpoints`, `project_invites`, `audit_events`.

Declared FKs mainly bind tokens→subjects, projects→workspaces and project children→projects. Many subject-id fields are logical references rather than declared SQL FKs and require a deliberate WORK05 decision.
