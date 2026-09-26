# LIVE TEST PROTOCOL — v0.1.7-alpha.2.4.1

## Goal
Validate Account Shell Foundation after GitHub Pages deployment.

## Desktop smoke
1. Open Nexus home.
2. Confirm version `v0.1.7 α2.4.1`.
3. Confirm account chip in topbar.
4. If Nexus Cloud is already connected, confirm nickname `Akronikl` (or configured display name) is visible.
5. Open account dropdown.
6. Open `Профиль`.
7. Verify tabs:
   - Профиль
   - Обучение
   - Устройства
   - Безопасность
8. Confirm no raw `nxk_...` token is shown anywhere.
9. Return to Project Studio and verify existing Cloud Sync state still works.

## Mobile smoke
1. Open installed/web PWA.
2. Confirm account avatar/icon fits topbar.
3. Open menu.
4. Open Account Center.
5. Confirm layout does not overflow horizontally.

## Optional disconnect/reconnect
Only if desired:
1. Account → Profile.
2. Disconnect Nexus Cloud on this device.
3. Verify local projects remain.
4. Reconnect through Project Studio using the saved token.
5. Verify account chip returns to cloud-linked state.

## Evidence
Recommended screenshots:
- topbar with connected account nickname;
- open account dropdown;
- Account Center profile;
- Account Center security;
- mobile account header.

## PASS condition
No regression in home navigation, Project Studio or existing Cloud Sync.
