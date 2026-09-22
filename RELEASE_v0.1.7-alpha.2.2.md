# AKRONIKL IT NEXUS v0.1.7-alpha.2.2

**Release name:** Cloudflare Sync Transport Preview

The release turns the previous Sync & Team data model into a real deployable Cloudflare transport. A Nexus owner can bootstrap one account, receive a random device token, connect Project Studio to the Worker, push a project into D1/R2 and import/pull it on another device.

The account token is a temporary first account UX for validating the architecture. The server stores only the token hash. A later release can replace manual token entry with Google/OIDC without changing project ownership, workspace, ACL, revision or audit schemas.

The release remains local-first. Losing connectivity does not remove local projects. Stale cloud writes return a revision conflict rather than silently overwriting another device's newer revision.
