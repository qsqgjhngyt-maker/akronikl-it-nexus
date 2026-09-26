# CHANGELOG v0.1.7-alpha.2.4.1

## Nexus Account Shell Foundation

### Added
- visible account state in global topbar;
- account dropdown;
- Account Center;
- profile/learning/devices/security tabs;
- home account card;
- current Nexus Cloud display-name bridge;
- current device identity display;
- planned provider surface for Yandex/Google/Apple/Phone/Passkey;
- local Cloud disconnect action.

### Security
- Account Shell never reads/renders the raw Nexus Cloud token.
- Identity v2 providers remain explicitly PLANNED.

### Tests
- new `account-shell-v1-check.mjs`;
- total regression: 37/37 PASS.
