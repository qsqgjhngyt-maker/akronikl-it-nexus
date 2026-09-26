# Session Security — Target Design

## Preferred model

Use an **opaque random session secret**:

- generated server-side;
- high entropy;
- sent only in a `Secure; HttpOnly` cookie;
- database stores only hash/HMAC of the secret;
- session row contains account/device/expiry/revocation metadata.

The application must not use the current long-lived `nxk_...` token as the final browser session credential.

## Deployment prerequisite

Current frontend and API are on different registrable sites (`github.io` and `workers.dev`).

For public Identity v2, prefer a first-party deployment such as:

```text
app.<project-domain>
api.<project-domain>
```

or a same-origin `/api` route.

This avoids making the security model depend on third-party cookie acceptance.

## Session lifecycle

Candidate policy:
- create after successful primary authentication;
- rotate on login;
- rotate after account linking;
- rotate on privilege elevation;
- revoke on logout;
- revoke selected device/session;
- revoke all sessions after account recovery/security reset;
- maintain idle and absolute expiry.

Exact timeouts remain environment-configurable.

## Session row

Candidate fields:
- `id`
- `account_id`
- `device_id`
- `secret_hash`
- `status`
- `auth_strength`
- `mfa_at`
- `created_at`
- `last_seen_at`
- `idle_expires_at`
- `absolute_expires_at`
- `revoked_at`
- `revoked_reason`

## Browser rule

Browser JS may read:
- account nickname/avatar;
- session metadata;
- CSRF token if used.

Browser JS must not read the raw HttpOnly session cookie.

## Step-up

Sensitive actions should require recent strong auth:
- disable MFA;
- register/remove passkey;
- unlink last recovery identity;
- change admin role;
- revoke all sessions;
- content publishing/admin destructive actions.
