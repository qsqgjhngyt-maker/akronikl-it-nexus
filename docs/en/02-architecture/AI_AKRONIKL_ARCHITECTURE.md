# Akronikl / Nexus AI Architecture

**Current:** structured client context foundation only.  
**Target:** research architecture with context policy, Learner Model, Skill Graph, approved RAG, project/code grounding and a secure AI gateway.

No production LLM gateway is implemented in runtime `v0.1.7-alpha.2.2.1`.

Security rules:
- no provider key in public JS/localStorage/repository;
- no account/session token in prompts;
- no blind upload of DOM/localStorage/project;
- no AI override of server ACL;
- no unrestricted production shell execution.
