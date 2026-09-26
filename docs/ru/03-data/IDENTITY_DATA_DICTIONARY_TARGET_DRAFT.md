# Target Identity v2 — Data Dictionary Draft

## accounts
Stable Nexus account root. Replaces the idea that a long-lived token is the account itself.

Candidate fields:
- `id`
- `display_name`
- `status`
- `created_at`
- `updated_at`

## account_identities
External login identities linked to one Nexus account.

Candidate fields:
- `provider`
- `provider_subject`
- verified email/phone attributes where provider supplies them
- timestamps

Security:
- no OAuth client secret in this table;
- no raw provider access token unless a future provider integration has a documented encrypted-token requirement.

## account_sessions
Revocable user login sessions.

Candidate data:
- account
- device
- auth strength
- expiry
- revoke state
- last seen

Session bearer/cookie secret must not be stored raw in database if a hash/reference model is used.

## account_devices
User-visible device/session management unit:
- label
- platform
- first/last seen
- status

## account_passkeys
WebAuthn public credential material:
- credential id
- public key
- sign count
- transports

Private key remains in authenticator and is never stored by Nexus.

## account_mfa_methods
Method metadata. For TOTP, `secret_ref` means encrypted/secret-store reference, not plaintext application log material.

## account_recovery_codes
Only hashes of recovery codes should be server-stored.

## user_profiles
User-facing profile independent from authentication identities.

This separation allows:
- identity provider changes;
- account profile continuity;
- multiple login methods for the same person.
