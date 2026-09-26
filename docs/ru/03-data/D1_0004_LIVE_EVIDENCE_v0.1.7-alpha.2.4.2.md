# D1 Migration 0004 — LIVE Evidence

**Release:** v0.1.7-alpha.2.4.2

Verified production objects:

Tables:
- account_devices
- account_sessions
- identity_security_events

Indexes:
- idx_account_devices_subject
- idx_account_sessions_hash
- idx_account_sessions_subject
- idx_account_sessions_device
- idx_identity_security_subject

Initial state:
`devices=0, sessions=0, security_events=0`

After controlled session lifecycle:
`devices=1, sessions=1, active_sessions=0, revoked_sessions=1, security_events=2`

This proves that the test session was persisted, revoked and audited.
