# First-Party Auth Deployment Requirement

## Problem

A static frontend hosted on one site and authentication API on an unrelated site can force browser auth to depend on cross-site cookie policies.

For a long-lived consumer PWA this is fragile.

## Target

Before public Identity v2 release, route frontend and API under the same registrable domain:

```text
app.example.tld
api.example.tld
```

or:

```text
example.tld
example.tld/api/*
```

## Benefits
- first-party session cookies;
- simpler SameSite policy;
- more predictable mobile/browser behavior;
- clearer cookie scope;
- safer Origin allowlist;
- easier CSP/redirect URI governance.

## Current alpha

Current `github.io → workers.dev` transport remains valid for `nexus-token` Cloud Sync testing.

This document does **not** require moving the frontend immediately; it is a production Identity gate.
