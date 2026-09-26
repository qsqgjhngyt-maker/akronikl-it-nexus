# RELEASE v0.1.7-alpha.2.4.1

**Name:** Nexus Account Shell Foundation  
**Date:** 2026-09-26

## User-visible change
Nexus Account is now visible as a first-class platform surface.

A user can see:
- account nickname/status in topbar;
- account state on home;
- Profile / Learning / Devices / Security center.

If current Nexus Cloud is already connected, Account Shell uses its existing display name and account link.

## Current implementation boundary
The release does not yet implement:
- Yandex ID;
- Google;
- Apple;
- Phone OTP;
- Passkey;
- revocable server sessions.

These remain the next Identity v2 implementation work.

## Backend
No Cloudflare Worker deployment is required.
