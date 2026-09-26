# Identity v2 Threat Model — Summary

Primary threats:
session theft, forged provider callback, unsafe account linking, OTP guessing/abuse, CSRF, XSS token theft, enumeration, privilege escalation, IDOR, recovery abuse, open redirect, admin compromise and identity data leakage into AI context.

Primary controls:
server-side broker, one-time state/nonce/PKCE transaction, explicit linking, HttpOnly revocable session, CSRF/Origin policy, passkey/TOTP, rate limits, step-up authentication, server-owned roles and security audit.
