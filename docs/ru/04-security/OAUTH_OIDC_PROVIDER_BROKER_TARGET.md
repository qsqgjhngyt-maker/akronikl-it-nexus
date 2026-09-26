# Federated Identity Provider Broker — Target

## Scope

Planned adapters:
- Yandex ID
- Google
- Apple

Provider-specific endpoints/scopes are implementation configuration, not hard-coded architectural constants.

## Security pattern

Nexus server starts and completes the provider transaction.

Required transaction fields:
- transaction id;
- provider;
- random `state`;
- nonce where protocol/provider uses it;
- PKCE verifier/challenge where applicable;
- redirect target allowlisted by Nexus;
- operation type: sign-in vs link;
- current account/session binding for link operation;
- created/expiry timestamp;
- one-time-use status.

## Callback validation

Reject if:
- transaction missing/expired/used;
- state mismatch;
- provider mismatch;
- issuer/audience/nonce verification fails where applicable;
- redirect target is not allowlisted;
- provider identity is already linked to another Nexus account during linking.

## Provider token handling

Default target:
- use provider tokens only for the sign-in/link flow;
- do not store them in browser;
- do not persist refresh tokens unless a future product feature explicitly needs provider API access.

Authentication should depend on the stable provider identity, not continuous access to provider APIs.

## Account key

Canonical external identity key:

```text
(provider, provider_subject)
```

Never auto-merge accounts only because email strings match.
