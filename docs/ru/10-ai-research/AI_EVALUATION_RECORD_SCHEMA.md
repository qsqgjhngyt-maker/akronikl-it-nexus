# AI Evaluation Record Schema — Draft

```json
{
  "experimentId": "EXP-...",
  "interactionId": "aiint-...",
  "condition": "GENERIC|RAG|CODE|LEARNER|FULL",
  "datasetVersion": "...",
  "taskId": "...",
  "participantPseudoId": "...",
  "modelRef": "...",
  "contextSchemaVersion": "...",
  "learnerModelVersion": "...",
  "skillGraphVersion": "...",
  "ragIndexVersion": "...",
  "metrics": {
    "taskSuccess": true,
    "timeToSolutionSec": 0,
    "hintCount": 0,
    "repeatedError": false
  },
  "rubric": {
    "correctness": null,
    "personalization": null,
    "grounding": null,
    "pedagogy": null
  },
  "failureTags": [],
  "createdAt": "..."
}
```

Direct contact identity is not required in evaluation records.
