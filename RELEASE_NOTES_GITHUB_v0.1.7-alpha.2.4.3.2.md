Identity v2 UI-state hotfix following the controlled server-session revoke LIVE test.

## Fixed
- Account Center top `Identity transport` updates immediately after current-session revoke.
- `SESSION MIGRATION` switches immediately to legacy fallback without F5.
- automatic stale-session fallback updates the same summary state.

## Proven baseline retained
- server-side revoke: LIVE PASS;
- automatic legacy fallback: LIVE PASS;
- D1 revoked state: LIVE PASS;
- security audit: LIVE PASS;
- migration bridge returned to false.

No Worker or D1 change is included in this release.
