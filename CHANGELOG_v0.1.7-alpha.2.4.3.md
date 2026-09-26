# CHANGELOG v0.1.7-alpha.2.4.3

## Devices & Sessions / Session Migration Foundation

### Added
- live server Devices & Sessions UI in Account Center;
- session-first Identity credential resolver;
- `sessionStorage`-only `nxs_...` credential support;
- safe stale-session → legacy rollback;
- device/session status, timestamps and active-session counts;
- revoke session action with explicit confirmation;
- revoke device action with explicit confirmation;
- migration transport status.

### Security
- raw credentials are not rendered;
- no session credential is persisted to `localStorage`;
- frontend does not call `/api/v2/session/bridge`;
- frontend cannot enable `IDENTITY_V2_BRIDGE_ENABLED`;
- legacy Cloud Sync remains unchanged for rollback.

### Backend
No new Worker deploy and no D1 migration are required.

Production backend baseline remains `v0.1.7-alpha.2.4.2` FULL LIVE PASS.
