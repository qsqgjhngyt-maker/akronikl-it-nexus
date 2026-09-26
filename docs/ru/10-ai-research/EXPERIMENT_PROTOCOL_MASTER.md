# Master Experiment Protocol

## Experimental systems
- **A — Generic LLM:** минимум общего контекста.
- **B — Course RAG:** A + approved course retrieval.
- **C — Code Grounded:** A + structured project/code/diagnostic context.
- **D — Learner Aware:** A + learner state + skill prerequisites.
- **E — Nexus Full:** LM + KG + RAG + CODE + Context Policy.

## Primary comparisons
- A vs B — retrieval contribution;
- A vs C — code grounding contribution;
- A vs D — personalization contribution;
- A vs E — total Nexus effect;
- E minus each component — ablation.

## Experimental unit
Заранее выбирается одно:
- task attempt;
- hint request;
- learner/task pair;
- diagnostic-resolution episode.

## Participant studies
Где возможно:
- randomized or counterbalanced assignment;
- matched task difficulty;
- baseline skill recorded;
- blinded human evaluation.

## Before final run
Фиксируются:
- hypothesis;
- primary metric;
- exclusion rules;
- sample/power plan;
- model/config;
- analysis method.

Повторные наблюдения одного пользователя не считаются независимыми без статистической корректировки.
