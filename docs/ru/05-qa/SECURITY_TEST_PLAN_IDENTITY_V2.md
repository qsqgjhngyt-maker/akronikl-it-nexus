# Identity v2 Security Test Plan

## Unit
- auth transaction expiry/one-time use;
- state mismatch rejection;
- provider-subject uniqueness;
- session hash verification;
- revoked/expired session rejection;
- session rotation;
- CSRF validation;
- Origin allowlist;
- account-link collision;
- unlink-last-recovery guard;
- TOTP verify/encryption adapter;
- OTP HMAC/expiry/attempt cap;
- recovery-code one-time use;
- passkey challenge replay rejection;
- admin step-up enforcement.

## Integration
- mock Yandex provider;
- mock Google provider;
- mock Apple provider;
- mock SMS provider;
- passkey/WebAuthn browser test where supported;
- callback error paths;
- provider outage.

## Abuse
- OTP resend burst;
- OTP guess burst;
- auth start flood;
- invalid recovery attempts;
- enumeration comparison;
- revoked device repeated requests.

## Cross-device
- login device A;
- login device B;
- revoke B from A;
- verify B fails server-side;
- revoke all;
- verify all old sessions fail.

## Migration
- current owner proves `nxk_...` token control;
- links Identity v2;
- projects remain attached;
- new session works;
- legacy token can be revoked;
- rollback window does not duplicate account.

## Acceptance gate
No public Identity v2 release until critical auth test set is automated and LIVE tested.
