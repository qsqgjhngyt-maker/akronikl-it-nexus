# Session Security — Target

Use an opaque high-entropy session secret in a Secure/HttpOnly cookie. Store only hash/HMAC server-side.

Rotate on login, linking and privilege elevation. Revoke server-side on logout/device revocation.

Public rollout should use a first-party domain arrangement rather than depend on cross-site cookie behavior between unrelated hosts.
