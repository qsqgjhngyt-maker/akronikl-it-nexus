# Sequence — Current Nexus Account Bootstrap

**Status:** IMPLEMENTED and LIVE verified.

```mermaid
sequenceDiagram
    actor U as Owner
    participant B as Browser/PWA
    participant W as Cloudflare Worker
    participant D as D1

    U->>B: Worker URL + BOOTSTRAP_SECRET + displayName
    B->>W: POST /api/v1/bootstrap
    Note over B,W: x-nexus-bootstrap-secret
    W->>W: Check AUTH_MODE=nexus-token
    W->>W: Constant-style hash compare secret
    W->>D: COUNT account_subjects
    D-->>W: 0
    W->>W: Generate subjectId + nxk token
    W->>W: SHA-256(raw token)
    W->>D: INSERT account_subject + token hash
    D-->>W: OK
    W-->>B: 201 subject + raw token (shown once)
    B->>B: Save current Cloud Sync config
    B->>W: GET /api/v1/me + Bearer token
    W->>D: Lookup token hash + active subject
    D-->>W: subject
    W->>D: UPDATE token.last_used_at
    W-->>B: subject + authMode
```

## Security notes

- Worker stores token hash, not raw token.
- Bootstrap closes after the first account exists.
- `BOOTSTRAP_SECRET` is a Worker secret and must not be committed.
- Current browser storage of the long-lived `nxk_...` token is `FOUNDATION` debt and must be replaced by Identity v2 session design.
