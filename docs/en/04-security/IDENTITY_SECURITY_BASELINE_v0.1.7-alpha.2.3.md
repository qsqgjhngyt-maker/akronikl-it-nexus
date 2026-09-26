# Nexus Identity & Security Baseline

Stage `v0.1.7-alpha.2.3` WORK05, runtime `v0.1.7-alpha.2.2.1`.

Target:
- federated/passwordless-first Nexus Account;
- Yandex/Google/Apple adapters;
- phone OTP;
- passkeys;
- TOTP/recovery;
- revocable devices/sessions;
- explicit account linking;
- step-up for sensitive/admin actions.

Current `nxk_...` storage is an alpha foundation debt and is not the target browser session model.

Public Identity v2 requires first-party/same-site deployment for robust protected session cookies.
