# Account Recovery & Lockout — Target

## Recovery methods
- linked external identity;
- passkey on another device;
- verified phone where enabled;
- one-time recovery codes.

## Recovery codes
- generated with high entropy;
- displayed once;
- stored only as hash/HMAC;
- single use;
- regenerating invalidates old unused codes.

## Recovery action
A successful high-risk recovery should:
- create a new session;
- revoke or challenge old sessions;
- notify the user through available channels;
- create a security audit event.

## Lockout philosophy

Avoid permanent global lockout after a few failures because it enables denial of service.

Prefer:
- per-challenge attempt limits;
- exponential/cooldown delay;
- rate limits;
- step-up/risk challenge;
- provider-specific protection.

## Support recovery

Manual developer/support override is **not** part of initial target.

If ever introduced:
- dual authorization;
- strict audit;
- no ability to view existing secrets;
- defined identity proof procedure.
