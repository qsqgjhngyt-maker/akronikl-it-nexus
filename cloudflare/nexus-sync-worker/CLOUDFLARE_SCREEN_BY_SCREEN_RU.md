# Cloudflare setup — screen-by-screen — v0.1.7-alpha.2.2.1

Target path:
`PC / phone → GitHub Pages Nexus → Cloudflare Worker → D1`

## Required resources
1. Worker: `akronikl-nexus-sync`
2. D1: `akronikl-nexus-sync`
3. D1 binding: `DB`
4. Variables: `ENVIRONMENT=production`, `AUTH_MODE=nexus-token`, `ALLOWED_ORIGIN=https://qsqgjhngyt-maker.github.io`
5. Encrypted secret: `BOOTSTRAP_SECRET`
6. No R2 bucket/binding is required.

## D1 schema
Run migrations 0001, 0002, 0003 (or use `setup/INITIAL_SCHEMA.sql` on a new database). The expected additional D1-only table is `project_snapshots`.

## Worker code
For Dashboard Editor paste the full `dist/worker.js` and deploy.

## Health
Open `https://akronikl-nexus-sync.akronikl.workers.dev/api/v1/health`. Expected worker version `0.1.7-alpha.2.2.1-d1`, `storage=d1-only`, `d1=true`.

## Bootstrap
Frontend `v0.1.7-alpha.2.2.1` → Project Studio → Cloud Sync. Leave token empty only for the first account; enter the Worker bootstrap secret locally and account name `Akronikl`. On success save the one-time `nxk_...` token securely.

## Current LIVE status
The previous real bootstrap attempt ended with Chromium `net::ERR_CONNECTION_RESET`. This hotfix corrects CORS preflight and empty Authorization behavior; repeat LIVE protocol after deployment.
