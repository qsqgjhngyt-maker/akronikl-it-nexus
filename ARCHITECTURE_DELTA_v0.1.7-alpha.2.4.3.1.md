# Architecture Delta — v0.1.7-alpha.2.4.3.1

**Release:** Cloud UX & Account Routing Cleanup  
**Date:** 2026-09-27

## Why this increment exists
During Android LIVE testing of `v0.1.7-alpha.2.4.3`, the generic **Cloud Sync** button on the Projects dashboard was interpreted as project synchronization management even though its actual role was account/bootstrap configuration.

The backend and project sync path were healthy: Android linked to the Nexus Cloud account, discovered the remote project at cloud revision 7, imported it and recorded `sync.pulled`. The issue was information architecture, not transport.

## Responsibility split

### Account Center → Nexus Cloud
Owns device-level account/cloud configuration:
- connect an existing Nexus Cloud account;
- alpha bootstrap when explicitly required;
- change endpoint/credential;
- disconnect Nexus Cloud on this device;
- show connection/account/device state without rendering raw credentials.

### Projects dashboard
Owns project-level entry actions only:
- create a new project;
- import an existing project from cloud;
- navigate back to Programming.

The ambiguous `Cloud Sync` setup button is removed.

### Open project → SYNC
Owns synchronization of that specific project:
- PUSH;
- PULL;
- local/cloud revision state;
- audit trail;
- settings button routes to `Account → Nexus Cloud`.

## Unconfigured-device behavior
`↓ Из облака` no longer silently launches account bootstrap. It explains that Nexus Cloud is not connected and offers a route to `Account → Nexus Cloud`.

## Backend delta
None.

- Worker unchanged: `0.1.7-alpha.2.4.2-identity-foundation`;
- D1 migration unchanged: `0004`;
- `IDENTITY_V2_BRIDGE_ENABLED=false` remains the required production state;
- Project Studio Cloud Sync protocol remains explicit/manual.
