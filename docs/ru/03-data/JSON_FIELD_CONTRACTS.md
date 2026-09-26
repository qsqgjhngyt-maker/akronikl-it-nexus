# JSON-in-TEXT Field Contracts

Current D1 schema contains JSON-in-TEXT fields:
- `project_access_policies.actions_json`
- `project_invites.scope_json`
- `audit_events.metadata_json`
- `project_snapshots.snapshot_json`

## Required future discipline

Each JSON payload needs:
- owner module;
- schema/version;
- validation function;
- maximum size where relevant;
- forward/backward compatibility rule.

## Current status

`project_snapshots.snapshot_json` is the largest and most important aggregate. Worker enforces overall snapshot size.

`audit_events.metadata_json` should remain supplemental metadata, not the only place where essential queryable fields live.

`actions_json` and `scope_json` should be validated before persistence.

## Rule

Do not move structured high-value fields into opaque JSON solely to avoid schema design.
