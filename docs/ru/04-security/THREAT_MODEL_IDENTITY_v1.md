# Threat Model — Nexus Identity v2

Method: STRIDE-inspired practical threat model.

| ID | Threat | Example | Primary controls |
|---|---|---|---|
| T-ID-001 | Spoofing | stolen session secret | HttpOnly, hash-at-rest, rotation, revoke |
| T-ID-002 | Spoofing | forged provider callback | state/nonce/PKCE/provider verification |
| T-ID-003 | Account takeover | unsafe email auto-link | explicit linking, provider_subject uniqueness |
| T-ID-004 | Account takeover | stolen OTP | short expiry, one-time use, attempts/rate limits |
| T-ID-005 | Replay | reused auth transaction | one-time transaction state |
| T-ID-006 | CSRF | attacker triggers sensitive mutation | SameSite + CSRF + Origin |
| T-ID-007 | XSS credential theft | JS reads token | HttpOnly session; CSP/XSS hygiene |
| T-ID-008 | Enumeration | phone/email response difference | uniform responses + rate limit |
| T-ID-009 | Privilege escalation | browser claims admin role | server-owned roles/authz |
| T-ID-010 | IDOR | read another project/session | server ownership/membership checks |
| T-ID-011 | Recovery abuse | support bypass | no initial manual override |
| T-ID-012 | Token leakage | token in logs/Git/screenshot | redaction, secret policy |
| T-ID-013 | MFA reset takeover | weak reset flow | step-up/recovery proof + audit |
| T-ID-014 | Session fixation | reused pre-login session | rotate on authentication |
| T-ID-015 | Open redirect | malicious returnTo | strict allowlist |
| T-ID-016 | SMS abuse | pumping/billing attack | quotas/cooldowns/provider budget |
| T-ID-017 | Audit tampering | client hides event | server-side auth audit |
| T-ID-018 | Admin compromise | stolen ordinary session used in admin | stronger role + step-up |
| T-ID-019 | Cross-device stale state | revoked device remains active | server revocation check |
| T-ID-020 | AI leakage | auth state enters prompt | context boundary/redaction |

## Security assumptions
- HTTPS is mandatory;
- Cloudflare Worker Secrets are not exposed to browser;
- current GitHub repository remains public-safe;
- user device may be compromised; therefore browser is not trusted as authorization authority.

## Residual risks
- phishing for federated provider accounts;
- SIM swap for phone login;
- endpoint abuse at scale;
- user device malware;
- provider outage.

These are reduced, not fully eliminated.
