# LIVE TEST PROTOCOL — v0.1.7-alpha.2.4.3.1

## Production invariants
Do not change Cloudflare during this test:
- Worker remains `0.1.7-alpha.2.4.2-identity-foundation`;
- D1 remains migration `0004`;
- `IDENTITY_V2_BRIDGE_ENABLED=false`.

## A. Desktop
1. Confirm badge `v0.1.7 α2.4.3.1`.
2. Open **Projects**.
3. Confirm dashboard contains `+ Новый проект` and `↓ Из облака` but **no Cloud Sync setup button**.
4. Open Account → **Nexus Cloud**.
5. Confirm current linked account/endpoint/device are visible without raw token.
6. Open an existing cloud project.
7. In SYNC confirm PUSH/PULL remain present.
8. Press SYNC settings gear; expected route: Account → Nexus Cloud.

## B. iPhone
Repeat read-only checks 1–5. Confirm no horizontal overflow and Account → Nexus Cloud is usable.

## C. Android
1. Projects dashboard no longer shows ambiguous Cloud Sync setup control.
2. `↓ Из облака` discovers cloud projects when linked.
3. Existing project cloud rev remains visible.
4. Account → Nexus Cloud is the only account connection/configuration surface.

## D. Unconfigured-device route
On a disposable/local-only browser profile:
1. Projects → `↓ Из облака`.
2. Confirm explanatory dialog appears.
3. Accept navigation.
4. Confirm route opens Account → Nexus Cloud.
5. Cancel account prompts if not performing an actual connection.

## PASS criteria
- no duplicate account-setup entry point in Projects;
- Account Center owns Cloud config;
- project import remains functional;
- project PUSH/PULL remains functional;
- no raw credential rendered;
- no backend changes;
- bridge remains disabled.
