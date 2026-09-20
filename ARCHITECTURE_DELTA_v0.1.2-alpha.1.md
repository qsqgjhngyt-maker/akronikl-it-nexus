# Architecture Delta — v0.1.2-alpha.1

## Content localization

До релиза v0.1.2 runtime загружал только `lessons.ru.json`.

Теперь C++ course package содержит:
- `lessons.ru.json` — полный baseline 40/40;
- `lessons.en.json` — частичный authoring package.

`lessonData(id)` выбирает локализованное тело по stable ID. Если EN-версия конкретного урока отсутствует, используется RU fallback. Прогресс не дублируется, потому что storage key остаётся привязан к language-neutral lesson ID.

## Benchmark data model

Урок может опционально иметь объект `benchmark`:
- `whyItMatters`
- `outcomes`
- `prerequisites`
- `quickUnderstand`
- `fullTheory`
- `inside`
- `walkthrough`
- `experiments`
- `errors`
- `practice`
- `lab`
- `knowledgeCheck`
- `skillGraph`
- `summary`
- `modernNotes`
- `historicalContext`

Старые baseline-уроки без `benchmark` продолжают рендериться прежним UI.

## Compatibility

Изменение additive:
- storage schema не ломается;
- legacy migration не меняется;
- curriculum IDs не меняются;
- existing baseline lesson schema остаётся валиден.
