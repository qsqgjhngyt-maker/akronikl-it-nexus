# Architecture Delta — v0.1.7-alpha.2.4.2

## Current runtime added

### Identity persistence
- `account_devices`
- `account_sessions`
- `identity_security_events`

### Credential families
- legacy `nxk_...` — retained for current Cloud Sync
- foundation `nxs_...` — revocable server session credential

D1 stores the session secret **hash only**.

### Session lifecycle
- create via gated legacy bridge;
- authenticate;
- current session;
- session list;
- revoke current/specific/all;
- device list/revoke foundation;
- idle/absolute expiry;
- security audit.

### Feature flag
`IDENTITY_V2_BRIDGE_ENABLED`

Normal production state after LIVE verification:
`false`.

## Compatibility invariant

Identity v2 foundation is additive.
Legacy Cloud Sync was LIVE verified after backend deployment:
PULL PASS, PUSH PASS, cloud revision 6→7.

## Target still not implemented
- first-party HttpOnly session cookie;
- provider broker runtime;
- Yandex/Google/Apple;
- phone OTP;
- passkeys;
- TOTP/recovery.
