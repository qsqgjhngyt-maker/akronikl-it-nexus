# ADR-0013 — Nexus Cloud configuration belongs to Account Center

**Status:** Accepted  
**Date:** 2026-09-27

## Context
The Projects dashboard exposed `Cloud Sync` beside `↓ Из облака`. The first control configured the device/account connection; the second operated on remote projects. During Android LIVE testing this produced a false impression of a routing defect.

## Decision
Adopt three explicit ownership levels:

1. **Account Center → Nexus Cloud** — device/account connection and configuration.
2. **Projects dashboard** — project creation and cloud project import.
3. **Open project → SYNC** — project-specific PUSH/PULL, revision state and audit.

Project surfaces may link to Account Center settings but do not own account bootstrap/configuration.

## Consequences
### Positive
- clearer UX and test protocol;
- Cloud/Identity lifecycle aligns with Account/Device ownership;
- future Identity v2 session migration has one canonical settings surface;
- project operations remain explicit.

### Trade-off
Users needing to change endpoint/credentials leave Project Studio and open Account Center, which is intentional because the operation is account/device-scoped.
