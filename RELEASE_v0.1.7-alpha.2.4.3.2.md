# RELEASE v0.1.7-alpha.2.4.3.2

**Name:** Identity Session UI State Refresh Hotfix  
**Date:** 2026-09-29  
**Type:** frontend-only Identity v2 hotfix

## Purpose
Close the final UX defect discovered during the real Account Center session revoke / automatic legacy fallback LIVE test.

## Result
Account Center summary and live session panel now derive from the same canonical browser credential state after every Identity refresh.

## Server baseline
No backend deployment required.

## Release gate
- automated regression: required PASS;
- post-deploy desktop reactive revoke smoke: required;
- iPhone/Android spot-check: required.
