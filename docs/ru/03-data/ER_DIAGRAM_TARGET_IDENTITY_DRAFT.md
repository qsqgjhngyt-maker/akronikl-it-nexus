# ER Diagram — Target Identity v2 Draft

**Status: PLANNED / DESIGN DRAFT.**  
Not deployed. Final design belongs to WORK05.

```mermaid
erDiagram
    ACCOUNTS {
      TEXT id PK
      TEXT display_name
      TEXT status
      TEXT created_at
      TEXT updated_at
    }

    ACCOUNT_IDENTITIES {
      TEXT id PK
      TEXT account_id FK
      TEXT provider
      TEXT provider_subject
      TEXT normalized_email
      INTEGER email_verified
      TEXT created_at
      TEXT last_used_at
    }

    ACCOUNT_SESSIONS {
      TEXT id PK
      TEXT account_id FK
      TEXT device_id FK
      TEXT status
      TEXT auth_strength
      TEXT created_at
      TEXT last_seen_at
      TEXT expires_at
      TEXT revoked_at
    }

    ACCOUNT_DEVICES {
      TEXT id PK
      TEXT account_id FK
      TEXT label
      TEXT platform
      TEXT first_seen_at
      TEXT last_seen_at
      TEXT status
    }

    ACCOUNT_PASSKEYS {
      TEXT id PK
      TEXT account_id FK
      TEXT credential_id
      TEXT public_key
      INTEGER sign_count
      TEXT transports_json
      TEXT created_at
      TEXT last_used_at
    }

    ACCOUNT_MFA_METHODS {
      TEXT id PK
      TEXT account_id FK
      TEXT kind
      TEXT status
      TEXT secret_ref
      TEXT created_at
      TEXT verified_at
    }

    ACCOUNT_RECOVERY_CODES {
      TEXT id PK
      TEXT account_id FK
      TEXT code_hash
      TEXT status
      TEXT created_at
      TEXT used_at
    }

    USER_PROFILES {
      TEXT account_id PK,FK
      TEXT username
      TEXT avatar_ref
      TEXT bio
      TEXT locale
      TEXT timezone
      TEXT updated_at
    }

    ACCOUNTS ||--o{ ACCOUNT_IDENTITIES : has
    ACCOUNTS ||--o{ ACCOUNT_DEVICES : owns
    ACCOUNTS ||--o{ ACCOUNT_SESSIONS : authenticates
    ACCOUNT_DEVICES ||--o{ ACCOUNT_SESSIONS : creates
    ACCOUNTS ||--o{ ACCOUNT_PASSKEYS : registers
    ACCOUNTS ||--o{ ACCOUNT_MFA_METHODS : secures
    ACCOUNTS ||--o{ ACCOUNT_RECOVERY_CODES : recovers
    ACCOUNTS ||--|| USER_PROFILES : has
```

## Provider identity rule

A federated identity should be unique by:

```text
(provider, provider_subject)
```

Email alone must not silently merge accounts.

Account linking requires an authenticated user action and provider verification.

## Candidate providers
- Yandex ID
- Google
- Apple
- phone OTP
- passkey/WebAuthn as credential type

Exact provider set and implementation can change in WORK05.
