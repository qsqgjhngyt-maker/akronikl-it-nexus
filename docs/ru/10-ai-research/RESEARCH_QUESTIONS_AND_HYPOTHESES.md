# Research Questions & Hypotheses

## RQ-01 — Personalization
Улучшает ли Learner Model качество объяснения по сравнению с Generic LLM?

**H1:** learner-aware вариант повышает pedagogical fit и next-task success.

## RQ-02 — Skill Graph
Даёт ли граф prerequisites дополнительную ценность сверх обычного порядка уроков?

**H2:** graph-aware assistant реже рекомендует материал с неосвоенными prerequisites.

## RQ-03 — RAG
Снижает ли retrieval по утверждённому учебному контенту неподтверждённые утверждения?

**H3:** RAG повышает grounding/faithfulness.

## RQ-04 — Code Context
Улучшает ли structured project/code context помощь при compiler/runtime/test errors?

**H4:** code-grounded variant повышает error-correction success и снижает hint count.

## RQ-05 — Full Nexus Context
Даёт ли LM + KG + RAG + CODE больший полезный эффект, чем компоненты по отдельности?

**H5:** full-context system показывает лучший интегральный learning utility.

## RQ-06 — Context Budget
Есть ли точка, после которой дополнительный контекст ухудшает качество/latency/cost?

**H6:** relevance-ranked bounded context эффективнее naïve whole-history context.

## RQ-07 — Cold Start
Как персонализировать нового пользователя при малом числе событий?

**H7:** graph priors + early diagnostic tasks лучше пустого профиля.

## RQ-08 — Model Robustness
Сохраняется ли эффект Nexus context на нескольких моделях?

**H8:** архитектурный эффект контекста сохраняется, хотя абсолютное качество моделей различается.

## RQ-09 — Recommendation
Улучшает ли graph/learner-aware recommendation следующий шаг?

**H9:** снижается prerequisite violation rate и растёт activity success.

## RQ-10 — Privacy-Minimized Context
Можно ли сохранить качество при передаче меньшего объёма пользовательских данных?

**H10:** structured/minimized context даёт близкое качество при меньшей privacy cost.
