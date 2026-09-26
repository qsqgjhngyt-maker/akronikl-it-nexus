# Passkey / MFA Target

Passkeys are preferred strong authentication. TOTP is supported. SMS may be phone sign-in/recovery but is not the preferred second factor.

Passkey private keys never leave the authenticator. TOTP secrets require encrypted server-side storage. Recovery codes are one-time and stored non-raw.
