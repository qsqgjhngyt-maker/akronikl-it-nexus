# Ablation Study Plan

Full system:
`LM + KG + RAG + CODE`

Ablations:
- FULL − LM
- FULL − KG
- FULL − RAG
- FULL − CODE
- FULL − LM − KG
- RAG only
- CODE only
- Generic LLM

Metrics:
- next-task success;
- repeated-error rate;
- correctness;
- personalization;
- grounding;
- latency;
- context size;
- cost where applicable.

Если удаление компонента не снижает полезные outcomes, его сложность/privacy cost должна быть пересмотрена.
