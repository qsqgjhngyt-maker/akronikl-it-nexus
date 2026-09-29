# CHANGELOG v0.1.7-alpha.2.4.3.2

## Fixed
- Account Center no longer requires F5 to update `Identity transport` after revoking the current server session.
- `SESSION MIGRATION` state now switches immediately from `Server session` to `Legacy credential + server API` when the temporary `nxs_...` credential is removed.
- automatic stale-session fallback also refreshes the top summary.

## Unchanged
- session revoke API;
- device revoke API;
- D1 schema;
- Cloud Sync protocol;
- migration bridge policy.
