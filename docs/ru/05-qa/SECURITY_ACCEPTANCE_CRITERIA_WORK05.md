# Security Acceptance Criteria — Identity v2

| ID | Criterion |
|---|---|
| SEC-AC-001 | browser cannot assign itself platform/project role |
| SEC-AC-002 | raw session secret is not stored in D1 |
| SEC-AC-003 | provider client secrets are not in client bundle/Git |
| SEC-AC-004 | state mismatch/expired auth transaction is rejected |
| SEC-AC-005 | same email does not auto-merge two provider identities |
| SEC-AC-006 | revoked session fails server-side |
| SEC-AC-007 | critical security settings require recent auth/step-up |
| SEC-AC-008 | OTP challenge is expiring, one-time and rate-limited |
| SEC-AC-009 | OTP is not stored as plaintext/plain low-entropy hash |
| SEC-AC-010 | passkey private key is never stored by Nexus |
| SEC-AC-011 | recovery codes are one-time and stored non-raw |
| SEC-AC-012 | cookie-auth mutations are CSRF/origin protected |
| SEC-AC-013 | open redirects are blocked |
| SEC-AC-014 | security logs contain no auth secrets |
| SEC-AC-015 | user can view/revoke sessions |
| SEC-AC-016 | migration from `nxk_...` preserves project ownership |
| SEC-AC-017 | public auth runs under first-party deployment policy |
| SEC-AC-018 | Identity data is excluded from AI context by default |
