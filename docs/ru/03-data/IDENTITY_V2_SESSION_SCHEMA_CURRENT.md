# Identity v2 Session Schema — Current

## account_devices
One server-side device record per account/device identifier.

Fields:
- `id`
- `subject_id`
- `label`
- `platform`
- `status`
- `first_seen_at`
- `last_seen_at`

## account_sessions
Revocable short-lived session record.

Fields:
- `id`
- `subject_id`
- `device_id`
- `secret_hash`
- `status`
- `auth_strength`
- `created_at`
- `last_seen_at`
- `idle_expires_at`
- `absolute_expires_at`
- `revoked_at`
- `revoked_reason`

The raw `nxs_...` secret is never stored in D1.

## identity_security_events
Account-level security audit independent from project/workspace audit.

Initial actions include:
- `auth.session.bridge_created`
- `auth.session.revoked`
- `auth.session.revoked_all`
- `auth.device.revoked`

## Table count
Current D1 schema after migration 0004: **15 application tables**.
