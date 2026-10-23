# CP-1.1 — TEST MATRIX

**База:** `0f71bb9f8752a34040ccb007acb2efcb89d8e36a` (Alpha10.3.1).

| Gate | Что доказывает | Команды |
|---|---|---|
| Additive-only boundary | CP-1.1 не меняет runtime/Identity/Cloud/production files | `git diff --name-only BASE HEAD` + allowlist |
| Content Schema | Формальная структура и generic non-C++ compatibility | `node tools/validate-content.mjs`; `node --test tests/content-contract.test.mjs` |
| C++ / Academy | Stable IDs, 40 lessons, benchmark, Lesson Standard, catalog, public content, RU/EN render | production/benchmark/lesson/catalog/public/shared-learning tests |
| Studio | Code Studio / Project Studio contracts и real ESM imports | module-import + Code Studio + Project Studio tests |
| Offline/PWA | C++ offline workspaces и verified public PWA policy | offline-learning + pwa-policy |
| Cloud Sync | first-party session transport, no legacy fallback, UI routing, unified cloud semantics | 4 synthetic Cloud Sync tests |

Все Cloud tests используют только synthetic storage/fetch и не требуют реальных credentials или production writes.

## CP-1.1-specific assertions

- Course package schema универсальна и не содержит C++ runtime constants.
- Synthetic Computer Graphics package с `graphics.exercise` валиден.
- C++ reference contract: 6 modules, 40 topics, 40 exercises, 6 practices, 7 projects.
- 15 skill references происходят только из существующих benchmark `strengthens`.
- 3 темы имеют подтверждённый skill mapping; 37 — `pending-cp3`.
- `cpp.const-correctness` сохраняется как source alias и нормализуется в canonical `cpp.const.correctness`.
- Skill Graph, Learning Events, Mastery не заявляются IMPLEMENTED.
