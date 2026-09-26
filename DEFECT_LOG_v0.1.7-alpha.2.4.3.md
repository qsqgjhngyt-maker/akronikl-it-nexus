# DEFECT LOG v0.1.7-alpha.2.4.3

## Known expected limitations
- normal browser login still relies on legacy Nexus Cloud credential;
- no automatic server-session issuance while production bridge is false;
- current server-session marker exists only when Account Center is actually authenticated by an `nxs_...` session;
- historical revoked sessions/devices remain visible by design;
- first-party HttpOnly session is not implemented yet.

## Safety constraints
- no raw credential in DOM;
- no `nxs_...` in localStorage;
- no automatic bridge enable;
- destructive revoke requires confirmation.

## LIVE defects
To be filled after desktop/iPhone/Android smoke.
