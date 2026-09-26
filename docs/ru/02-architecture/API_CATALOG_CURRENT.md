# Current Cloud API Catalogue — `v0.1.7-alpha.2.2.1`

**Service:** `akronikl-nexus-sync`  
**Worker version:** `0.1.7-alpha.2.2.1-d1`  
**Storage:** `d1-only`  
**Auth mode:** `nexus-token`

## Conventions

Success and error payloads are JSON.

Error form:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Authenticated routes use:

```http
Authorization: Bearer nxk_...
```

The raw token value must never be committed or placed in documentation/evidence.

## Endpoints

| Method | Path | Auth | Purpose | Success |
|---|---|---|---|---|
| GET | `/` | no | same health response | 200 |
| GET | `/api/v1/health` | no | service/storage/bootstrap state | 200 |
| OPTIONS | `*` | no | CORS preflight | 204 |
| POST | `/api/v1/bootstrap` | bootstrap secret | create first subject + first token | 201 |
| GET | `/api/v1/me` | Bearer | current Nexus subject | 200 |
| GET | `/api/v1/projects` | Bearer | accessible projects | 200 |
| GET | `/api/v1/projects/:id` | Bearer + view | current project snapshot | 200 |
| PUT | `/api/v1/projects/:id` | Bearer + ACL | create/update project snapshot | 200 |
| GET | `/api/v1/projects/:id/audit` | Bearer + audit_view | last server audit events | 200 |

## GET /api/v1/health

Response includes:

- `ok`;
- `service`;
- `version`;
- `storage`;
- `authMode`;
- `d1`;
- `bootstrapOpen`;
- `maxSnapshotBytes`.

## POST /api/v1/bootstrap

Headers:

- `content-type: application/json`;
- `x-nexus-bootstrap-secret`.

Body:

```json
{"displayName":"Akronikl"}
```

Returns raw Nexus token exactly at account creation time.

Important errors:
- `BOOTSTRAP_MODE_MISMATCH` — 409;
- `BOOTSTRAP_SECRET_MISSING` — 503;
- `BOOTSTRAP_UNAUTHORIZED` — 401;
- `BOOTSTRAP_CLOSED` — 409.

## Authentication errors

- `AUTH_NOT_CONFIGURED` — 503;
- `DEV_AUTH_FORBIDDEN` — 503;
- `UNAUTHORIZED` — 401;
- `INVALID_TOKEN` — 401;
- `AUTH_ADAPTER_REQUIRED` — 503.

## GET /api/v1/projects/:id

Server:
1. loads project metadata;
2. checks `view`;
3. loads snapshot for current revision;
4. returns `project` + `meta`.

Important errors:
- `PROJECT_NOT_FOUND` — 404;
- authorization — 403;
- `SNAPSHOT_MISSING` — 500.

## PUT /api/v1/projects/:id

Body contract:

```json
{
  "project": {"id":"..."},
  "baseRevision": 5
}
```

Main invariants:
- URL id equals `project.id`;
- serialized snapshot ≤ 1,500,000 bytes;
- existing update requires exact `baseRevision == current_revision`;
- changed paths pass ACL;
- metadata changes require project-level `edit`.

Important errors:
- `INVALID_JSON` — 400;
- `PROJECT_ID_MISMATCH` — 400;
- `SNAPSHOT_TOO_LARGE` — 413;
- `REVISION_CONFLICT` — 409;
- workspace/project authorization errors — 403.

Successful response:

```json
{
  "ok": true,
  "projectId": "...",
  "revision": 6,
  "hash": "...",
  "sizeBytes": 12345,
  "storage": "d1-only",
  "updatedAt": "..."
}
```

## CORS

Worker reflects CORS only when request `Origin` exactly equals configured `ALLOWED_ORIGIN`.

Current allowed methods declaration:
`GET, PUT, POST, DELETE, OPTIONS`.

Not every declared method currently has a route.
