# Security Baseline Closure

Security baseline now explicitly separates:

## Current alpha
- nexus-token authentication;
- Worker-side project authorization;
- token hash at rest;
- exact-origin CORS;
- revision/payload limits.

## Target public Identity
- server-side provider broker;
- first-party session deployment;
- revocable sessions/devices;
- explicit account linking;
- passkeys/TOTP;
- recovery;
- CSRF/Origin protection;
- abuse/rate limiting;
- security audit;
- admin step-up.

## AI boundary
Auth/session/recovery secrets are excluded from AI context by default.
