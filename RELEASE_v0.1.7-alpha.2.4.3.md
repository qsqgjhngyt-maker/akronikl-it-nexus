# RELEASE v0.1.7-alpha.2.4.3

**Name:** Devices & Sessions / Session Migration Foundation  
**Date:** 2026-09-27  
**Type:** frontend Identity runtime increment

## User-visible result
Account → Devices now reads real production Identity v2 data:
- registered server devices;
- device status/platform/last activity;
- active server-session count;
- server sessions;
- auth strength;
- last activity / absolute expiry;
- current server-session marker when an `nxs_...` session is present.

Users can explicitly:
- revoke an active server session;
- revoke a device and its active server sessions.

Both actions require confirmation.

## Migration foundation
Account Center now resolves credentials in this order:

1. revocable `nxs_...` session from `sessionStorage`;
2. legacy Nexus Cloud credential as migration rollback.

If an `nxs_...` session returns `401 INVALID_SESSION`, the stale temporary credential is cleared and Account Center can retry through the legacy credential.

## Safety
- `nxs_...` is never written to localStorage;
- raw credentials are never rendered;
- migration bridge remains false by default;
- no frontend code enables the bridge;
- Cloud Sync transport remains unchanged.

## Backend
No Worker/D1 change required.
Production backend remains the already LIVE-verified `v0.1.7-alpha.2.4.2` Identity Session Foundation.

## LIVE status
Automated candidate checks must pass before deploy.
Desktop + iPhone + Android Account Center smoke is required after GitHub Pages deployment.
Destructive revoke actions are tested only with an intentionally disposable test session/device.
