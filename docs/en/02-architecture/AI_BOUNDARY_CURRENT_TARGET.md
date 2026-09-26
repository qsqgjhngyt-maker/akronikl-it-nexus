# Nexus AI — Current/Target Boundary

Current runtime contains a minimal structured context foundation only. It has no production LLM gateway, Learner Model, Skill Graph, RAG or Recommendation Engine.

Target research flow:

```mermaid
flowchart LR
    UI["Nexus UI"] --> P["Permission/Context Policy"]
    LM["Learner Model"] --> C["Context Engine"]
    KG["Skill Graph"] --> C
    RAG["Approved RAG"] --> C
    PC["Project/Code Context"] --> C
    P --> C
    C --> G["Secure AI Gateway"]
    G --> M["AI Provider"]
    M --> G
    G --> UI
```

Target rule: use the minimum permitted context and never place account/session/provider secrets into prompts.
