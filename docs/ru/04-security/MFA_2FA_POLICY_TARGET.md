# MFA / 2FA Policy — Target

## Authentication strength levels

Candidate model:

- `AAL1-NEXUS`: one verified federated/phone factor;
- `AAL2-NEXUS`: primary auth + TOTP or strong passkey/user verification;
- `STEP_UP`: recent strong authentication for sensitive operation.

These are internal product labels, not claims of external certification.

## Preferred methods
1. Passkey/WebAuthn
2. TOTP authenticator
3. Recovery code for recovery only

## SMS

SMS OTP may be:
- a phone sign-in method;
- a controlled recovery method.

SMS should **not** be the preferred second factor when passkey/TOTP is available.

## TOTP storage

TOTP shared secret must be recoverable for verification, therefore:
- never plaintext in D1/logs;
- encrypt server-side with versioned encryption key stored in Worker Secret/secret manager;
- support key rotation.

## MFA enrollment
- require authenticated recent session;
- display recovery codes once;
- require verification before activation;
- audit activation/deactivation.

## MFA reset
Requires strong recovery proof and revokes existing sessions where appropriate.
