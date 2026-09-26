# AI Research Requirements — v0.1.7-alpha.2.3

**Статус:** RESEARCH. Эти требования не заявляют, что AI-подсистема уже реализована. Они определяют научную программу будущей интеллектуальной подсистемы и дипломной работы.

| ID | Status | Area | Requirement |
| --- | --- | --- | --- |
| AIR-001 | RESEARCH | Research question | Даёт ли структурированный персональный контекст статистически/практически значимое улучшение качества учебной помощи относительно Generic LLM? |
| AIR-002 | RESEARCH | Baseline A | Generic LLM получает пользовательский вопрос без Nexus Learner/Graph/Project enrichment. |
| AIR-003 | RESEARCH | System B | Nexus AI получает разрешённые Learner Model + Skill Graph + RAG + Project Context. |
| AIR-004 | RESEARCH | Learner state | Определить формальную схему mastery/confidence/recent-errors/attempt history. |
| AIR-005 | RESEARCH | Skill graph | Определить ontology/prerequisites и способ обновления mastery узлов. |
| AIR-006 | RESEARCH | RAG corpus | Определить версионируемый approved corpus и критерии retrieval correctness. |
| AIR-007 | RESEARCH | Code grounding | Определить формат безопасного контекста файлов, diagnostics, tests и recent diffs. |
| AIR-008 | RESEARCH | Objective metrics | Измерять success-after-hint, repeated-error rate, time-to-solution, hints-to-solution, test/compiler pass after intervention. |
| AIR-009 | RESEARCH | Rubric metrics | Оценивать factual correctness, pedagogical appropriateness, personalization, grounding, clarity, hallucination. |
| AIR-010 | RESEARCH | Ablation | Сравнить вклад отдельных компонентов: без graph, без RAG, без learner state, без project context. |
| AIR-011 | RESEARCH | Privacy | Не использовать лишние персональные/проектные данные; исследовать минимально достаточный контекст. |
| AIR-012 | RESEARCH | Reproducibility | Фиксировать model id/version, prompt policy, retrieval config, dataset snapshot и evaluation script. |
| AIR-013 | RESEARCH | Human evaluation | Для субъективных критериев определить rubric и, при возможности, blind evaluation несколькими оценщиками. |
| AIR-014 | RESEARCH | Limitations | Отдельно фиксировать ошибки, uncertainty, hallucinations, ограничения выборки и внешнюю валидность. |

## Research gate

Перед признанием AI-функции «готовой» необходимо сохранить:
1. dataset/snapshot;
2. model/provider/version;
3. prompt/policy version;
4. retrieval/context configuration;
5. metrics;
6. baseline comparison;
7. error/limitation analysis;
8. reproducibility notes.
