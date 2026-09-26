# Authentication Incident Response — Draft

## Suspected session theft
1. revoke affected session;
2. offer revoke-all;
3. inspect security audit;
4. require step-up/re-auth;
5. rotate any affected server secret only if evidence points to server-secret leakage.

## Provider credential leak
1. rotate provider client secret/key;
2. invalidate pending auth transactions;
3. verify callback configuration;
4. audit unexpected login/link events.

## SMS abuse
1. disable/slow endpoint/provider route;
2. activate stricter rate limits;
3. inspect provider spend;
4. block abusive patterns without exposing account existence.

## Bootstrap/token leak
Current alpha:
- revoke `account_tokens` row;
- issue replacement only through controlled recovery/migration procedure;
- remove exposed token from client/screenshots/docs.

## Documentation
Every material incident should produce:
- incident id;
- timeline;
- impact;
- root cause;
- corrective action;
- regression test/ADR if architecture changes.
