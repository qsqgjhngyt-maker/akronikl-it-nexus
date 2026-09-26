# Current D1 Data Dictionary — Summary

- `account_subjects`: current account subject.
- `account_tokens`: hash-only long-lived alpha auth token record.
- `workspaces`: personal/team project namespace.
- `workspace_members`: workspace membership foundation.
- `projects`: cloud project metadata and current server revision.
- `project_members`: project-specific membership.
- `project_access_policies`: subject/role path-scoped allow/deny.
- `project_revisions`: immutable revision metadata.
- `project_snapshots`: D1-only full project JSON snapshot per revision.
- `project_checkpoints`: checkpoint metadata foundation.
- `project_invites`: invitation foundation.
- `audit_events`: append-style project/workspace audit.

Legacy debt: `r2_key` naming remains although production snapshot storage is D1-only.
