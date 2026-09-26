# Архитектура Akronikl / Nexus AI

**Runtime basis:** `v0.1.7-alpha.2.2.1`  
**Architecture baseline:** `v0.1.7-alpha.2.3` WORK03

## Current state — FOUNDATION

Production runtime currently contains only client-side contextual foundation (`akronikl/context.js`). It does **not** contain a production LLM gateway or RAG pipeline.

```mermaid
flowchart LR
    UI["Lesson / Sandbox / Project UI"]
    CTX["Akronikl Context v1"]
    UI --> CTX
```

Current context is intended to keep assistant integration structured rather than scrape arbitrary page state.

## Target research architecture — RESEARCH/PLANNED

```mermaid
flowchart LR
    UI["Nexus UI"]
    POLICY["Permission / Context Policy"]
    LM["Learner Model"]
    KG["Skill Graph"]
    RAG["Approved Course RAG"]
    CODE["Project/Code Grounding"]
    CE["Context Engine"]
    GW["Secure AI Gateway"]
    MODEL["AI Provider(s)"]

    UI --> POLICY
    POLICY --> CE
    LM --> CE
    KG --> CE
    RAG --> CE
    CODE --> CE
    CE --> GW
    GW --> MODEL
    MODEL --> GW
    GW --> UI
```

## Security principles

Forbidden:
- API/provider secret in `index.html`, JS bundle or public repository;
- account/session token in prompt;
- blind upload of all DOM/localStorage/project files;
- model-direct access to infrastructure credentials;
- unrestricted shell execution;
- AI overriding Worker ACL decisions.

## Research principle

The target assistant is not accepted merely because it can chat. It must be evaluated against Generic LLM baseline under AIR-001..014.

## Offline fallback

Static explanations, diagnostics, local heuristics and course content should remain usable without a cloud AI provider where practical.
