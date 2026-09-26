# Identity v2 Session API Foundation

## Public

### GET `/api/v2/auth/capabilities`
No auth required.

Returns foundation status, bridge flag and session timeouts.

## Authenticated
Legacy `nxk_...` or session `nxs_...` can authenticate the following routes unless noted.

### POST `/api/v2/session/bridge`
Requires **legacy `nxk_...`** plus `IDENTITY_V2_BRIDGE_ENABLED=true`.

Body example:

```json
{
  "deviceId": "device-existing-id",
  "deviceLabel": "Desktop Chrome",
  "platform": "Windows"
}
```

Returns raw `nxs_...` once.

### GET `/api/v2/session`
Returns current auth/session metadata.

### DELETE `/api/v2/session`
Revokes current `nxs_...` session.

### GET `/api/v2/sessions`
Lists account sessions.

### DELETE `/api/v2/sessions/:id`
Revokes one account-owned session.

### POST `/api/v2/sessions/revoke-all`
Body:

```json
{"keepCurrent": true}
```

### GET `/api/v2/devices`
Lists account devices and active-session counts.

### DELETE `/api/v2/devices/:id`
Marks device revoked and revokes its active sessions.

## Security
The API never returns stored session hashes.
