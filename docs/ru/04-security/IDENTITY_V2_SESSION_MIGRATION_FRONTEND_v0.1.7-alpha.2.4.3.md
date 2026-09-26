# Identity v2 Frontend Session Migration — v0.1.7-alpha.2.4.3

## Credential resolution
Account Center:
1. checks temporary server-session credential in `sessionStorage`;
2. otherwise uses the current legacy Nexus Cloud credential;
3. if server session returns `401 INVALID_SESSION`, clears it;
4. may fall back to legacy credential.

## Why sessionStorage
Until first-party HttpOnly deployment exists, a foundation `nxs_...` credential must not become another long-lived browser secret.

Therefore:
- no localStorage;
- no indexed persistence;
- no DOM rendering;
- no console logging by product code.

## Rollback
Legacy Project Studio Cloud Sync is intentionally unchanged.
A UI/session migration problem must not make existing cloud projects inaccessible.

## Bridge
Frontend does not call the session bridge and cannot enable its Worker environment flag.
Controlled bridge use remains an operator maintenance action.
