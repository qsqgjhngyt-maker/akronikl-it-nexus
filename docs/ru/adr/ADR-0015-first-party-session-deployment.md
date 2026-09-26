# ADR-0015 — Public Identity v2 requires first-party session deployment

**Status:** Accepted as production gate

## Context
Current frontend/API hosts are on unrelated registrable sites.

## Decision
Before public cookie-session Identity v2, frontend/API are exposed under one registrable project domain or same origin.

## Consequence
Current GitHub Pages/Worker alpha can remain during development, but public session auth does not rely on third-party cookies.
