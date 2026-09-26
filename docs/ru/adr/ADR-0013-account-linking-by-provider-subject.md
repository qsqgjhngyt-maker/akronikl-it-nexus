# ADR-0013 — Account linking uses verified provider identity, not email auto-merge

**Status:** Accepted

## Context
Different providers may return the same, changed, hidden or relay email.

## Decision
Canonical external identity is `(provider, provider_subject)`.

A new provider is linked only through an explicit authenticated linking flow.

Matching email alone never silently merges accounts.

## Consequences
Reduces account-takeover risk at the cost of a more explicit duplicate-account recovery flow.
