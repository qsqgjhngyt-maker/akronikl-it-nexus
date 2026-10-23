# CP-1.1 CHANGESET

База: `0f71bb9f8752a34040ccb007acb2efcb89d8e36a`.

Добавлено:

- `content/schemas/content-package-v1.schema.json`;
- `courses/cpp/content-package.json`;
- `tools/content-contract-lib.mjs`;
- `tools/validate-content.mjs`;
- `tests/content-contract.test.mjs`;
- `content/README.md`;
- `docs/ru/03-content/CONTENT_CONTRACT_CP1_1.md`;
- `docs/ru/adr/ADR-0021-CP1_1-CONTENT-CONTRACT.md`;
- `.github/workflows/cp11-content-contract.yml`.

Не изменены production runtime/data contracts: C++ content payloads, progress/localStorage, Code Studio, Project Studio, PWA/service worker, Identity, Cloud Sync.


## Failed experiment / regression gate

Первый CI run `39895851099` остановился на legacy `tools/verify-v011.mjs`: скрипт требовал удалённый ранее `id="boot-status"`.
Проверка исходного Alpha10.3.1 SHA `0f71bb9f8752a34040ccb007acb2efcb89d8e36a` подтвердила, что `index.html` уже не содержит этот marker.
CP-1.1 schema/semantic validation и 4 contract tests в этом run прошли PASS.

Решение: CP-1.1 gate использует актуальный `tests/production-entry-syntax-check.mjs` вместо устаревшего v0.1.1 probe. Production-файл `tools/verify-v011.mjs` не изменяется.


## Architecture self-review после первого Automated PASS

Первый зелёный CI не считался финальным закрытием. Дополнительный review выявил:

1. первоначальная schema была слишком C++-специфичной;
2. первоначальный synthetic mapping `1 Topic = 1 Skill` мог исказить будущий Skill Graph/ML evidence;
3. benchmark content содержит legacy alias `cpp.const-correctness` / `cpp.const.correctness`.

Исправление:

- schema стала course-generic;
- C++ Skill foundation теперь использует только существующие benchmark `strengthens`;
- 37 тем и все Practice/Project mappings, не имеющие подтверждённого skill mapping, помечены `pending-cp3`;
- alias нормализован adapter-слоем с сохранением обоих `sourceCodes`;
- добавлен synthetic Computer Graphics schema test, доказывающий non-C++ activity contract.
