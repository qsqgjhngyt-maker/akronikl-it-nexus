# Phone OTP Security — Target

## Threats
- OTP guessing;
- resend abuse;
- SMS pumping;
- account enumeration;
- SIM swap;
- replay;
- leaked plaintext OTP database.

## Challenge design

A phone challenge should include:
- id;
- normalized phone reference;
- purpose;
- created/expires time;
- attempt count;
- resend counter/cooldown;
- status.

## OTP storage

Do not store a six-digit OTP as raw text or plain SHA-256.

Preferred design:
- compute keyed HMAC over `challenge_id || otp`;
- key is a server secret;
- short expiry;
- one-time success;
- strict attempt limit.

## API behavior

Responses should avoid revealing whether an account exists.

Rate limit dimensions may include:
- phone number;
- IP/edge risk signal;
- device/session;
- account;
- global provider budget.

## Product note

Phone login requires an external SMS provider and anti-abuse budget/monitoring. It should not be enabled publicly merely because the UI is ready.
