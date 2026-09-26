# D1 Migration 0004 — Dashboard Apply Notes

## Important Cloudflare Dashboard behavior observed during LIVE deployment

The D1 Dashboard Console accepted **one SQL statement per request** in this environment.
The full migration file remains valid as a canonical migration artifact, but for manual Dashboard deployment execute each `CREATE TABLE` / `CREATE INDEX` statement separately.

Do not paste a set of statements and assume the Console executed the whole batch.

## Objects expected after migration

Tables:
- `account_devices`
- `account_sessions`
- `identity_security_events`

Indexes:
- `idx_account_devices_subject`
- `idx_account_sessions_hash`
- `idx_account_sessions_subject`
- `idx_account_sessions_device`
- `idx_identity_security_subject`

## Verification

Use `D1_0004_VERIFY.sql`, which is intentionally a **single SELECT** suitable for the Dashboard Console.

## LIVE result 2026-09-26

Migration was applied statement-by-statement and verified:
- 3/3 tables present;
- 5/5 indexes present;
- initial row counts 0/0/0.

Later controlled session lifecycle produced:
- devices = 1;
- sessions = 1;
- active_sessions = 0;
- revoked_sessions = 1;
- security_events = 2.
