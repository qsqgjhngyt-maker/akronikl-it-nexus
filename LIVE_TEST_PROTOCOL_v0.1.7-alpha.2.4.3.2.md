# LIVE TEST PROTOCOL — v0.1.7-alpha.2.4.3.2

## Preconditions
- deploy frontend only;
- Worker remains `0.1.7-alpha.2.4.2-identity-foundation`;
- `IDENTITY_V2_BRIDGE_ENABLED=false`;
- no D1 migration.

## A. Regression baseline
1. Confirm badge `v0.1.7 α2.4.3.2`.
2. Account → Devices.
3. Confirm legacy mode when no active `nxs_...` exists.
4. Confirm 2 devices / 0 active sessions / 0 current sessions from the completed controlled test.

## B. Reactive summary test
Use a new controlled disposable session only if required for full lifecycle proof.
1. Create disposable server session under operator control.
2. Return bridge to false.
3. Account → Devices should show `Server session` in both top summary and LIVE block.
4. Click `Завершить эту сессию` on the current disposable session.
5. **Without F5**, verify both top summary and LIVE block immediately show `Legacy credential + server API`.
6. Verify active/current session counts become 0.

## C. Mobile spot-check
On iPhone and Android, Account → Devices must remain readable and refresh normally.

## PASS
No page reload is required to synchronize Identity transport / migration summary after revoke or fallback.
