# Nexus Identity v2 — Target Architecture

**Status: PLANNED / DESIGN FROZEN AT ARCHITECTURE LEVEL.**  
Provider-specific implementation details remain implementation tasks.

```mermaid
flowchart LR
    USER["User"]
    APP["Nexus PWA"]
    API["Nexus Identity/API Worker"]
    TX[("Auth transactions")]
    DB[("Identity/Session Store")]
    Y["Yandex ID"]
    G["Google"]
    A["Apple"]
    SMS["Phone/SMS Provider"]
    PASSKEY["Platform Authenticator<br/>Passkey"]

    USER --> APP

    APP -->|auth start / session API| API
    API --> TX
    API --> DB

    API -->|OAuth/OIDC redirect| Y
    API -->|OAuth/OIDC redirect| G
    API -->|Sign-in flow| A
    API -->|OTP send/verify| SMS

    APP -->|WebAuthn ceremony| PASSKEY
    APP -->|assertion/attestation result| API
    API --> DB
```

## Server-side responsibilities

Identity Worker/BFF owns:
- provider state/nonce/PKCE transaction;
- authorization code exchange;
- provider subject validation;
- account resolve/link;
- session issue/rotate/revoke;
- passkey registration/authentication verification;
- MFA policy;
- recovery;
- security audit;
- rate/abuse controls.

## Browser responsibilities

Browser owns:
- user intent;
- redirects;
- WebAuthn browser API;
- displaying account/session state;
- CSRF token header when required;
- no provider/client secret storage.

## Provider abstraction

Target interface concept:

```text
IdentityProviderAdapter
- id
- startAuthorization()
- verifyCallback()
- normalizeIdentity()
- unlinkPolicy()
```

Provider identities resolve to stable `(provider, provider_subject)`.

Email is an attribute, not the canonical cross-provider identity key.
