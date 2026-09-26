# Migration Plan — `nexus-token` → Identity v2

Current account/project ownership must be preserved.

## Phase 0 — current
`account_subjects + account_tokens`, manual `nxk_...` token.

## Phase 1 — additive schema
Add Identity v2 tables without removing current token auth.

No current account/project id changes.

## Phase 2 — parallel auth
Worker accepts:
- legacy `nexus-token`;
- Identity v2 session.

Authorization always resolves to the same canonical Nexus account/subject mapping.

## Phase 3 — owner claim/link
Current owner signs in with `nxk_...` once and links:
- Yandex/Google/Apple/phone/passkey.

This is explicit proof that the new identity belongs to the current Nexus owner.

## Phase 4 — session default
UI uses Identity v2 sessions by default.
Legacy token UI is moved to advanced migration/emergency area.

## Phase 5 — legacy revoke
After successful login/recovery verification:
- revoke old bootstrap token;
- confirm projects/progress remain attached;
- remove raw token from browser config.

## Phase 6 — cleanup
Later:
- remove normal user dependency on `account_tokens`;
- retain migration/audit records according to policy;
- remove bootstrap UI from public product.

## Rollback principle
Until Phase 5, do not revoke the only working credential.

## Invariant
Project IDs, workspace IDs and audit history do not change merely because authentication changes.
