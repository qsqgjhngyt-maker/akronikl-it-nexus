# Account Linking Security

Account linking is a high-risk account-takeover surface.

## Rules

1. Link operation requires an already authenticated Nexus session.
2. Prefer recent/step-up authentication for adding a new recovery-capable identity.
3. Link transaction is bound to:
   - current Nexus account;
   - current session;
   - provider;
   - one-time state.
4. Provider identity must not already belong to another Nexus account.
5. Same email is **not** sufficient to merge accounts.
6. Unlinking is forbidden if it would leave the account without an approved recovery/sign-in path.
7. All link/unlink events are security-audited.
8. Admin/support must not silently merge accounts.

## Duplicate account recovery

If a user accidentally created two Nexus accounts:
- do not auto-merge;
- require proof of control of both accounts;
- use an explicit migration/merge workflow later;
- preserve project/progress provenance and audit.

## Apple/private relay note

Email address representation may differ from another provider. This further reinforces provider-subject identity rather than email-based automatic merge.
