# C4 Component — Current Runtime `v0.1.7-alpha.2.2.1`

**Status:** IMPLEMENTED/FOUNDATION по компонентам.

## Browser / PWA container

```mermaid
flowchart LR
    APP["core/app.js<br/>Platform Shell"]
    STORAGE["core/storage.js<br/>Course prefs/progress"]
    ID["core/identity.js<br/>Local Identity v1"]
    CTX["akronikl/context.js<br/>Context v1"]

    COURSE["core/course-registry.js<br/>Course Registry"]
    CODE["sandbox/code-studio.js<br/>Code Studio"]
    SANDBOX["sandbox/sandbox.js<br/>Sandbox Controller"]
    ROUTER["sandbox/runtime-router.js<br/>Runtime Router"]
    BROWSER["Browser Runtime Provider"]
    WASM["WASM Runtime Provider"]
    CLOUDR["Cloud Runtime Stub"]

    PSTUDIO["project-studio/project-studio.js<br/>Project Studio UI"]
    PSTORE["project-studio/project-store.js<br/>Project Store"]
    PBUILD["project-studio/project-build.js<br/>Build Adapter"]
    ACL["collaboration/access-control.js<br/>ACL Model"]
    AUDIT["collaboration/audit-log.js<br/>Local Audit"]
    SYNC["sync/cloud-sync.js<br/>Sync Orchestrator"]
    CFP["sync/cloudflare-provider.js<br/>Cloudflare Provider"]
    CFG["sync/cloudflare-config.js<br/>Current token config"]
    QUEUE["sync/sync-queue.js<br/>Queue Foundation"]

    APP --> STORAGE
    APP --> COURSE
    APP --> CODE
    APP --> PSTUDIO
    APP --> CTX

    CODE --> SANDBOX
    PSTUDIO --> SANDBOX
    SANDBOX --> ROUTER
    ROUTER --> BROWSER
    ROUTER --> WASM
    ROUTER --> CLOUDR

    PSTUDIO --> PSTORE
    PSTUDIO --> SYNC
    PSTORE --> ID
    PSTORE --> ACL
    PSTORE --> AUDIT
    PSTORE --> QUEUE
    PBUILD --> SANDBOX

    SYNC --> CFP
    SYNC --> CFG
    SYNC --> ID
    SYNC --> PSTORE
    SYNC --> AUDIT
    SYNC --> QUEUE
```

## Cloudflare Worker container

```mermaid
flowchart LR
    ROUTE["HTTP Router + CORS"]
    AUTHN["Authentication Adapter"]
    AUTHZ["Project Authorization"]
    PROJ["Project Service"]
    SNAP["D1 Snapshot Service"]
    AUD["Audit Service"]
    DB[("D1")]

    ROUTE --> AUTHN
    ROUTE --> PROJ
    PROJ --> AUTHZ
    PROJ --> SNAP
    PROJ --> AUD
    AUTHN --> DB
    AUTHZ --> DB
    SNAP --> DB
    AUD --> DB
```

## Component responsibility

| Component | Responsibility | Status |
|---|---|---|
| Platform Shell | route/render/bind, main UI | IMPLEMENTED |
| Course Registry/Storage | content loading, local course state | IMPLEMENTED |
| Code Studio | editor/VFS UX | IMPLEMENTED |
| Runtime Router | capability-based provider selection | IMPLEMENTED |
| WASM Runtime | C++ compilation/execution in browser worker | IMPLEMENTED |
| Project Studio | persistent engineering project UX | IMPLEMENTED |
| Local Identity v1 | device/local principal/account link fields | FOUNDATION |
| Local ACL | role/path policy model | FOUNDATION |
| Local Audit | browser-side append log | FOUNDATION |
| Cloud Sync | explicit PUSH/PULL orchestration | IMPLEMENTED |
| Sync Queue | queued sync model | FOUNDATION |
| Worker AuthN | nexus-token | FOUNDATION |
| Worker AuthZ | role + scope + explicit DENY | FOUNDATION |
| D1 snapshots/revisions | current Cloud project persistence | IMPLEMENTED |
| Akronikl Context v1 | minimal contextual payload | FOUNDATION |
| Full Nexus AI | — | RESEARCH/PLANNED |
