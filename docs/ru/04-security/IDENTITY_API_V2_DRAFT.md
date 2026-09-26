# Identity API v2 — Draft Contract

**Status: DESIGN. No route is implemented by WORK05.**

## Session
- `GET /api/v2/session`
- `POST /api/v2/logout`
- `POST /api/v2/logout-all`

## Federated auth
- `POST /api/v2/auth/start`
- `GET|POST /api/v2/auth/callback/:provider`

## Phone
- `POST /api/v2/auth/phone/start`
- `POST /api/v2/auth/phone/verify`

## Identities
- `GET /api/v2/identities`
- `POST /api/v2/identities/link/start`
- `DELETE /api/v2/identities/:id`

## Devices/sessions
- `GET /api/v2/devices`
- `GET /api/v2/sessions`
- `DELETE /api/v2/sessions/:id`

## Passkeys
- `POST /api/v2/passkeys/register/options`
- `POST /api/v2/passkeys/register/verify`
- `POST /api/v2/passkeys/auth/options`
- `POST /api/v2/passkeys/auth/verify`
- `DELETE /api/v2/passkeys/:id`

## MFA
- `POST /api/v2/mfa/totp/start`
- `POST /api/v2/mfa/totp/verify`
- `DELETE /api/v2/mfa/:id`

## Recovery
- `POST /api/v2/recovery/codes/regenerate`
- recovery-specific sign-in endpoints to be finalized after WORK05 implementation review.

## Security contract
Mutating cookie-auth requests:
- exact Origin;
- CSRF token;
- current session;
- step-up where required.

All response shapes must avoid returning auth secrets.
