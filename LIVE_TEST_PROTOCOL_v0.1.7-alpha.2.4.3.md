# LIVE TEST PROTOCOL — v0.1.7-alpha.2.4.3

## Preconditions
- production Worker remains `0.1.7-alpha.2.4.2-identity-foundation`;
- `IDENTITY_V2_BRIDGE_ENABLED=false`;
- legacy Cloud Sync is connected;
- do not expose raw `nxk_...` / `nxs_...`.

## A. Desktop read-only smoke
1. Confirm badge `v0.1.7 α2.4.3`.
2. Account → Devices.
3. Confirm server foundation status is available and bridge disabled.
4. Confirm real device list loads.
5. Confirm real server session history loads.
6. Confirm the current local device is marked when ids match.
7. Confirm transport says legacy-control unless a valid server session is intentionally present.
8. Project Studio → existing project → verify normal Cloud Sync state still appears.

## B. Mobile smoke
Repeat Account → Devices on:
- iPhone;
- Android.

Expected:
- no horizontal overflow;
- device/session cards readable;
- destructive buttons remain usable and separated.

## C. Safe revoke test
Do not revoke the only production access path casually.

Preferred test:
- create an intentionally disposable server session/device in a controlled maintenance window;
- return bridge to false;
- use Account Center to revoke that disposable session;
- verify status changes to revoked;
- verify D1/security audit;
- optionally revoke the disposable device.

## D. Session migration resolver test
When a controlled `nxs_...` credential is intentionally installed into the formal sessionStorage key:
- Account Center should report `Server session`;
- session list should mark current session;
- revoking current session clears the temporary credential;
- Account Center falls back to legacy credential if available.

## PASS
- real devices/sessions display correctly;
- no raw credential visible;
- no Cloud Sync regression;
- bridge remains false;
- revoke/migration behavior works only with explicit operator-controlled test data.
