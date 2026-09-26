# Authentication Security Audit Model — Target

## Event families
- `auth.login.succeeded`
- `auth.login.failed`
- `auth.logout`
- `auth.session.revoked`
- `auth.session.revoked_all`
- `auth.identity.linked`
- `auth.identity.unlinked`
- `auth.passkey.registered`
- `auth.passkey.removed`
- `auth.mfa.enabled`
- `auth.mfa.disabled`
- `auth.recovery.used`
- `auth.phone.challenge.sent`
- `auth.security.step_up`

## Event fields
- event id;
- account id if known;
- session/device id if known;
- provider/method;
- result/reason code;
- timestamp;
- security metadata minimized to purpose.

## Never log
- raw Nexus/session token;
- OAuth client secret;
- provider authorization code;
- raw TOTP secret;
- OTP;
- recovery code;
- BOOTSTRAP_SECRET;
- full project source by default.

## User visibility
Selected recent security events should be visible in user profile/security UI.
