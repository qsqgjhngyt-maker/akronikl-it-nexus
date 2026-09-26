# Sequence — Identity v2 Target Candidate

**Status:** PLANNED.  
**Не является implementation contract.** Финальный design принимается в WORK05 Identity & Security Design.

## Candidate federated sign-in

```mermaid
sequenceDiagram
    actor U as User
    participant B as Nexus PWA
    participant A as Nexus Identity Service
    participant I as External IdP
    participant D as Account Store

    U->>B: Войти
    B->>A: Start authorization
    A->>I: OAuth/OIDC authorization request
    I->>U: Authenticate / MFA if required
    I-->>A: Authorization response
    A->>I: Token/code verification
    A->>D: Resolve/link Nexus account identity
    D-->>A: Nexus account
    A-->>B: Protected Nexus session
    B->>A: GET account/profile
    A-->>B: account + device/session context
```

## Candidate passkey sign-in

```mermaid
sequenceDiagram
    actor U as User
    participant B as Nexus PWA
    participant A as Nexus Identity Service
    participant D as Account Store

    U->>B: Войти с passkey
    B->>A: Request challenge
    A-->>B: WebAuthn challenge
    B->>U: Face ID / Touch ID / platform auth
    B->>A: Signed assertion
    A->>D: Verify credential/account/session policy
    D-->>A: account
    A-->>B: Protected session
```

## Target properties

- user should not manually copy long-lived account tokens;
- multiple identities may be linked to one Nexus account;
- sessions/devices must be revocable;
- MFA/passkeys must be supported by the security model;
- browser JS must not receive provider client secrets;
- exact cookie/token model is not frozen in WORK03.
