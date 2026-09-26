# ADR-0014 — Passkey/TOTP are preferred strong-auth methods

**Status:** Accepted

## Decision
Passkeys/WebAuthn are preferred. TOTP is supported. SMS OTP may support phone sign-in/recovery but is not the preferred second factor.

## Reasons
- phishing resistance for passkeys;
- reduced SIM-swap dependence;
- no password database required for passkey/federated-first flow.

## Consequence
A recovery design is required so losing one device does not permanently lock out the account.
