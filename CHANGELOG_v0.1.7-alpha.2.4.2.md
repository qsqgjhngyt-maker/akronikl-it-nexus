# CHANGELOG v0.1.7-alpha.2.4.2

## Identity v2 Session Foundation

### Added
- `account_devices`;
- `account_sessions`;
- `identity_security_events`;
- server-side revocable `nxs_...` sessions;
- hash-only session secret storage;
- 60 minute idle timeout;
- 8 hour absolute timeout;
- session/device list and revoke foundation;
- security-event audit;
- gated `nxk_...` → `nxs_...` migration bridge;
- `/api/v2/auth/capabilities`;
- Account Center server-foundation status.

### LIVE verified
- D1 0004: PASS;
- Worker production deploy: PASS;
- existing `nxk_...` Cloud Sync PULL/PUSH: PASS;
- cloud revision 6→7: PASS;
- bridge disabled isolation: PASS;
- controlled session lifecycle create/auth/list/revoke: PASS;
- revoked credential rejected with `401 INVALID_SESSION`: PASS;
- D1 revoked state and security audit: PASS;
- bridge restored to false: PASS.

### Operational lessons
- Cloudflare D1 Dashboard Console was treated as one-statement-per-request for migration deployment.
- Built-in Worker Preview produced a misleading old/unauthorized response; direct production URL verification was authoritative.

### Security
- raw session credential is not stored in D1;
- test `nxs_...` credential was kept only in temporary `sessionStorage` and removed;
- raw tokens/secrets are excluded from release evidence.

### Not yet implemented
- first-party HttpOnly cookie session;
- Yandex ID;
- Google;
- Apple;
- phone OTP;
- Passkeys;
- TOTP/recovery.
