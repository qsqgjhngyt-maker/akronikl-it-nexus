# ADR-0012 — Identity v2 uses a server-side provider broker and revocable Nexus session

**Status:** Accepted for target architecture

## Context
Current long-lived Nexus token is suitable for alpha Cloud Sync but not normal consumer sign-in.

## Decision
External identity providers are mediated by a Nexus server-side Identity service. Successful authentication creates a revocable Nexus session.

The browser does not retain provider client secrets and normal users do not manually copy Nexus tokens.

## Consequences
Positive:
- provider abstraction;
- revocation/devices;
- MFA/step-up;
- safer secret handling.

Cost:
- additional server/session state;
- CSRF/session lifecycle;
- provider integration tests.
