# Device & Session Management — Target

## Profile UI

`Профиль → Безопасность → Устройства и сессии`

Each active session shows:
- user-friendly device label;
- platform/browser family;
- first/last activity;
- approximate session age;
- auth strength;
- `This device` marker.

Avoid displaying exact raw IP history by default.

## Actions
- rename device label;
- revoke one session;
- revoke all other sessions;
- view recent security events;
- register/remove passkeys;
- manage MFA/recovery.

## Server behavior

Revocation must take effect server-side, not only by clearing browser storage.

A revoked session hash must fail authentication immediately after revocation propagation.
