> **Primary documentation language: Russian.** The Russian version is normative. The English version is maintained as a secondary mirror for international users.

# ADR-0003-SECURE_AI_GATEWAY — AI access only through a trusted gateway

**Status:** Accepted

## Decision
API secrets are stored only on the trusted server/Worker side. The public PWA receives no provider secret.

## Rationale
A public client application cannot securely store a provider API key.

## Consequences
This decision is part of the Foundation architecture contract. Changes require a new ADR rather than a silent rewrite of history.
