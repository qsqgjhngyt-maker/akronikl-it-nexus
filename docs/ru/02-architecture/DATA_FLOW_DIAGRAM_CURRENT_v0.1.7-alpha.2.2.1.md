# Data Flow Diagram — Current `v0.1.7-alpha.2.2.1`

## Level 1

```mermaid
flowchart LR
    U["External Entity: User"]
    GP["External System: GitHub Pages"]

    P1["P1 Platform Shell / Learning"]
    P2["P2 Code + Project Studio"]
    P3["P3 Browser Runtime"]
    P4["P4 Cloud Sync Client"]
    P5["P5 Cloudflare Worker"]

    D1[("D1 Browser Course State")]
    D2[("D2 Browser Project State")]
    D3[("D3 Browser Identity/Sync Config")]
    D4[("D4 Cloudflare D1")]

    U -->|navigation, learning actions| P1
    P1 -->|progress/preferences| D1
    P1 -->|static asset requests| GP

    U -->|source code, project actions| P2
    P2 <--> D2
    P2 -->|runtime request| P3
    P3 -->|stdout/stderr/diagnostics| P2

    P2 -->|PUSH/PULL command| P4
    P4 <--> D3
    P4 -->|Bearer token + project/baseRevision| P5
    P5 -->|project/meta/errors/audit| P4
    P5 <--> D4
```

## Data classes

### Browser-only current data
- course preferences;
- course progress;
- project local state;
- local audit;
- device/local identity;
- current Cloud Sync config/token.

### Cloud current data
- account subject;
- token hash + metadata;
- workspaces/memberships;
- project metadata;
- project snapshots/revisions/checkpoints;
- project ACL/invites foundation;
- server audit events.

## Sensitive flows

1. Nexus token: Browser → Worker in `Authorization: Bearer`.
2. Bootstrap secret: Browser → Worker only during first account bootstrap.
3. Project source: Browser → Worker → D1 on explicit PUSH.
4. Project source: D1 → Worker → Browser on explicit PULL.

## Current privacy limitation

Cloud project source is uploaded only when the user explicitly enables/sends Cloud Sync. Full learning telemetry is not yet a production cloud stream.
