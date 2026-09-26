# Sequence — Revision Conflict and Recovery

**Status:** IMPLEMENTED and LIVE verified on PC ↔ iPhone.

```mermaid
sequenceDiagram
    participant PC as PC
    participant W as Worker/D1
    participant M as iPhone

    PC->>W: PULL rev 4
    W-->>PC: rev 4

    M->>W: PUSH baseRevision=4
    W-->>M: OK rev 5

    PC->>W: PUSH baseRevision=4
    W-->>PC: 409 REVISION_CONFLICT<br/>serverRevision=5

    PC->>W: PULL
    W-->>PC: project rev 5

    PC->>PC: user resolves/continues edit
    PC->>W: PUSH baseRevision=5
    W-->>PC: OK rev 6
```

## Architectural meaning

Optimistic concurrency prevents a stale client from silently overwriting a newer cloud state.

Current recovery is explicit:
1. detect conflict;
2. PULL current cloud state;
3. continue/reapply local change;
4. PUSH from the new base revision.

Automatic three-way merge is **not** current functionality and remains a future research/product decision.
