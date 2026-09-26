# Rate Limit & Abuse Protection — Target

## Protect
- auth start;
- provider callback failures;
- phone OTP send/verify;
- passkey option/verify;
- recovery code attempts;
- account linking;
- MFA verify/reset;
- admin endpoints.

## Dimensions
Use more than one dimension:
- session/account;
- device;
- phone/email/provider subject where appropriate;
- IP/edge risk signal;
- endpoint;
- global provider budget.

## Privacy
Raw IP persistence is not required for ordinary product analytics.

If security telemetry retains network identifiers:
- document purpose;
- minimize precision/retention;
- separate operational abuse protection from research analytics.

## Response
Avoid distinct error messages that enable user/account enumeration.
