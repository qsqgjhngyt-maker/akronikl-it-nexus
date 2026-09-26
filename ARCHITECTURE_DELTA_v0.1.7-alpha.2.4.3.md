# Architecture Delta — v0.1.7-alpha.2.4.3

## Scope
Frontend Identity increment over the production `v0.1.7-alpha.2.4.2` server/session foundation.

## Added
- real Devices & Sessions Account Center surface;
- Identity v2 credential resolver;
- `sessionStorage`-only `nxs_...` credential slot;
- server-session-first Account Center requests;
- automatic stale-session clearing and safe legacy rollback;
- server devices list;
- server sessions list;
- revoke specific session;
- revoke device and its active sessions;
- current local-device marker;
- responsive devices/session UI.

## Deliberately unchanged
- production Worker component remains `0.1.7-alpha.2.4.2-identity-foundation`;
- D1 schema remains migration `0004`;
- normal Project Studio Cloud Sync still uses current legacy configuration;
- `IDENTITY_V2_BRIDGE_ENABLED=false` remains production default.

## Migration boundary
This release does not create server sessions automatically and never enables the legacy migration bridge from the frontend.

When a future first-party session exists, Account Center can prefer it. If it expires during migration, the Account Center may clear the stale session credential and fall back to the existing legacy account credential.

This fallback is intentionally limited to Account Center Identity API requests; Project Studio Cloud Sync is not silently migrated in this increment.
