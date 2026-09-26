# Account Shell v1 — Security Review

## Passed design checks
- raw Cloud token is not read by `account-shell.js`;
- raw Cloud token is not rendered in global header/home/account page;
- account identifiers are shortened in UI;
- disconnect action clears current device Cloud configuration only;
- current server-side Worker authorization remains unchanged;
- planned provider buttons are non-operational and marked PLANNED.

## Remaining alpha debt
Current Cloud Sync still stores its long-lived token in browser-readable storage.

This release improves visibility and account UX but does not solve session security.

The proper fix remains Identity v2:
- first-party deployment;
- HttpOnly revocable sessions;
- passkeys/MFA;
- provider broker.
