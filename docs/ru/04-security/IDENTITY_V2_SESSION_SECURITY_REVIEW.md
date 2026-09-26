# Identity v2 Session Foundation — Security Review

## Improved over legacy token-only auth
- server sessions are individually revocable;
- session secret is stored in D1 only as SHA-256 hash;
- sessions have idle and absolute expiry;
- sessions are associated with device records;
- revocation is server-side;
- security lifecycle events are stored separately from project audit;
- legacy token remains available during additive migration.

## Current defaults
- idle expiry: 60 minutes;
- absolute expiry: 8 hours;
- bridge disabled unless explicitly enabled.

## Deliberately not implemented yet
- long-lived browser storage of `nxs_...`;
- production HttpOnly session cookie;
- first-party application domain;
- Yandex/Google/Apple;
- Phone OTP;
- Passkey/TOTP.

## Security rationale
A short-lived bearer session is useful to prove server lifecycle/revocation semantics, but it is not presented as the final browser credential architecture.

Final public auth still requires the first-party/session-cookie design documented in WORK05.
