# Current Cloud API Catalogue

Worker runtime: `0.1.7-alpha.2.2.1-d1`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | none | health/storage/bootstrap state |
| POST | `/api/v1/bootstrap` | bootstrap secret | first Nexus account/token |
| GET | `/api/v1/me` | Bearer | current subject |
| GET | `/api/v1/projects` | Bearer | project list |
| GET | `/api/v1/projects/:id` | Bearer + view | current snapshot |
| PUT | `/api/v1/projects/:id` | Bearer + ACL | create/update project |
| GET | `/api/v1/projects/:id/audit` | Bearer + audit_view | server audit |
| OPTIONS | `*` | none | CORS preflight |

Project update uses `baseRevision`; mismatch returns `409 REVISION_CONFLICT`. Snapshot limit is 1,500,000 bytes.
