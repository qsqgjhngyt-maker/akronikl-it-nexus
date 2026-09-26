# Architecture Delta — v0.1.7-alpha.2.3

This release does not introduce a new production subsystem. It closes the architecture/research baseline.

## Formalized current architecture
- Learning Platform
- Engineering Workspace
- Cloud Engineering Layer
- Worker + D1 current Cloud Sync
- browser-local state boundaries
- trust boundaries

## Formalized target architecture
- Nexus Identity v2
- account/session/device/passkey/MFA
- cloud learning profile
- Skill Graph/Learner Model
- Control Center/CMS
- Nexus AI Context/RAG/Evaluation layers

## Important boundary
Target/research components are not described as current implementation.

## Metadata delta
Frontend/application version and Service Worker cache are bumped to `0.1.7-alpha.2.3`.
Cloudflare Worker component version remains independently at its proven `0.1.7-alpha.2.2.1-d1` implementation until backend code changes.
