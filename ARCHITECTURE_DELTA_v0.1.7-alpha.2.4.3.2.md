# Architecture Delta — v0.1.7-alpha.2.4.3.2

## Delta
This hotfix does not alter the Identity v2 server model. It closes a frontend state-projection gap between:

1. canonical credential state (`identityV2CredentialState()`),
2. live Devices & Sessions API results,
3. static Account Center summary cards.

## Before
After current-session revoke, the lower live panel re-rendered from server data and legacy fallback, while the two summary cards retained markup produced during the previous page render.

## After
`refreshIdentityCredentialSummary()` projects canonical credential state into four stable UI targets:
- `identityTransportSummary`;
- `identityMigrationState`;
- `identityMigrationMode`;
- `identityMigrationRollback`.

The projection runs at Account Center binding and after every Devices & Sessions API refresh, including automatic stale-session fallback.

## Invariants
- no raw `nxk_...` / `nxs_...` rendered;
- no new session storage mechanism;
- no automatic migration bridge enable;
- legacy Cloud Sync unchanged;
- Worker/D1 unchanged.
