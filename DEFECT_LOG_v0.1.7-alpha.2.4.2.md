# DEFECT / OPERATIONS LOG — v0.1.7-alpha.2.4.2

## Closed / explained during LIVE

### OPS-242-001 — D1 Dashboard multi-statement migration did not apply as expected
Observed:
initial pasted migration batch did not create the session table.

Resolution:
migration 0004 executed statement-by-statement.
Dashboard verification file changed to a single SELECT.

Classification:
deployment-console behavior / operator workflow, not schema design failure.

### OPS-242-002 — large compound verification rejected
Observed:
`too many terms in compound SELECT`.

Resolution:
verification redesigned as one SELECT with scalar subqueries.

### OPS-242-003 — Worker built-in Preview returned old/unauthorized response
Observed:
Preview showed `Token and remote not found` while new Worker code was loaded.

Resolution:
direct production `/api/v1/health` was used as authoritative check and returned the expected new version.

## Product defects

No session-foundation product defect found in the controlled LIVE lifecycle.

## Remaining technical debt
- browser still uses legacy Cloud token for normal sign-in;
- public HttpOnly cookie session not enabled;
- first-party deployment not complete;
- federated providers/passkeys/MFA remain future increments.
