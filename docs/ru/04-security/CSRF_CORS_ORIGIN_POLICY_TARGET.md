# CSRF, CORS and Origin Policy — Target

## Current
Current Worker uses explicit `ALLOWED_ORIGIN` and Bearer token authentication.

## Target cookie session
For state-changing cookie-authenticated requests use layered controls:

1. exact Origin allowlist;
2. `Secure; HttpOnly` session cookie;
3. SameSite policy appropriate for first-party deployment;
4. CSRF token/header for mutating API calls;
5. reject missing/invalid CSRF for protected methods;
6. never use `Access-Control-Allow-Origin: *` with credentials.

## CSRF token
Candidate:
- returned by authenticated session endpoint;
- JS-readable;
- sent as `X-Nexus-CSRF`;
- bound/derived from session;
- rotates with session.

## Redirect safety

`returnTo` must be selected from a strict allowlist or normalized relative path.

Never accept arbitrary redirect URL from OAuth callback query.
