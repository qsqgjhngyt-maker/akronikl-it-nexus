# GitHub Publish Guide — v0.1.7-alpha.2.4.2

## 1. Commit repository overlay

Unpack:

`AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.2_GITHUB_REPO_OVERLAY.zip`

over current `main`, preserving folders.

Commit:

```text
feat: complete Identity v2 session foundation v0.1.7-alpha.2.4.2
```

Push to `main`.

## 2. Wait for GitHub Pages

Hard refresh and verify:
- version badge: `v0.1.7 α2.4.2`;
- Account Center opens;
- Security/Devices page shows server foundation available;
- migration bridge shows disabled;
- Project Studio opens;
- existing Cloud Sync state is intact.

This is the final frontend visual smoke.

## 3. Create GitHub Release only after that smoke

Tag:
`v0.1.7-alpha.2.4.2`

Title:
`AKRONIKL IT NEXUS v0.1.7-alpha.2.4.2 — Identity v2 Session Foundation LIVE PASS`

Description:
paste `RELEASE_NOTES_GITHUB_v0.1.7-alpha.2.4.2.md`.

Recommended release assets:
- `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.2_FULL_WITH_EVIDENCE.zip`
- `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.2_EVIDENCE_ORIGINALS.zip`
- `AKRONIKL_IT_NEXUS_v0.1.7-alpha.2.4.2_SHA256SUMS_FINAL.txt`

## 4. Do not publish secrets

Never attach:
- raw `nxk_...`;
- raw `nxs_...`;
- `BOOTSTRAP_SECRET`;
- provider/API secrets.

## Cloudflare

No additional Worker/D1 change is required for repository publication.
Production has already been deployed and verified.
Keep `IDENTITY_V2_BRIDGE_ENABLED=false`.
