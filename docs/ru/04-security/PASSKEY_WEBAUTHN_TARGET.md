# Passkeys / WebAuthn — Target

## Position

Passkeys are a preferred strong authentication method for Nexus.

Benefits:
- phishing-resistant public-key authentication;
- no Nexus password database;
- platform biometric/PIN UX;
- suitable for step-up and primary sign-in.

## Registration

Require:
- authenticated account;
- recent auth;
- server-generated challenge;
- approved RP ID/origin;
- unique credential id;
- user-visible device/passkey label.

Store:
- credential id;
- public key;
- account id;
- sign counter/policy metadata;
- transports where useful;
- timestamps.

Do **not** store authenticator private keys.

## Authentication

Verify:
- challenge;
- RP ID/origin;
- credential/account mapping;
- signature;
- authenticator/user-verification policy;
- replay/counter anomalies according to authenticator behavior.

## Recovery

Passkeys cannot be the only recovery strategy unless multi-device passkey availability is sufficiently reliable for the account.

Nexus should support at least one additional recovery path:
- second linked provider;
- verified phone if enabled;
- recovery codes.

## Admin

For platform-admin step-up, passkey is preferred where available.
