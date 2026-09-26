# Skill / Knowledge Graph — Data Contract Draft

**Status: RESEARCH.**

## Node
Stable skill concept:

```json
{
  "id": "skill-cpp-pointers",
  "code": "cpp.pointers",
  "name": "Указатели",
  "domain": "cpp",
  "status": "active"
}
```

## Edge

```json
{
  "prerequisiteSkillId": "skill-cpp-references",
  "targetSkillId": "skill-cpp-pointers",
  "relationType": "prerequisite",
  "weight": 1.0
}
```

## Content mapping
`unit_skills` links lesson/task/project evidence to graph nodes.

## Design rules
- graph identity must not depend on translated display names;
- cycles in strict prerequisite edges should be rejected or explicitly modeled;
- graph changes need versioning because they can change recommendation results;
- edge weights are metadata until a defined algorithm consumes them.
