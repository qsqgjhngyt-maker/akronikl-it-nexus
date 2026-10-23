# CP-1.1 — ПРЕДЛОЖЕНИЕ ПУБЛИКАЦИИ

## Candidate

- Repository: `qsqgjhngyt-maker/akronikl-it-nexus`
- Base main: `0f71bb9f8752a34040ccb007acb2efcb89d8e36a`
- Feature branch: `feature/cp-1.1-content-contract-foundation`
- Draft PR: `#14`

## Что предлагается публиковать

Только additive-only Content Foundation:

- Content Package JSON Schema;
- C++ reference `content-package.json`;
- validator + tests;
- CI/evidence gate;
- русская архитектурная документация и ADR.

Не публикуются как IMPLEMENTED:

- Skill Graph edges;
- Learning Events collection;
- Mastery Model;
- runtime integration нового contract;
- массовые языковые курсы.

## Merge gate

Merge в `main` разрешать только если одновременно:

1. final PR head основан на ожидаемом Alpha10.3.1 base или конфликт с более новым main отдельно рассмотрен;
2. additive-only boundary PASS;
3. Content Contract tests PASS;
4. C++/Academy regression PASS;
5. Code Studio/Project Studio regression PASS;
6. Offline/PWA regression PASS;
7. Cloud Sync synthetic regression PASS;
8. evidence artifact и SHA256 сформированы;
9. владелец дал явное разрешение на публикацию.

## Рекомендуемый merge message

`архитектура: внедрить CP-1.1 единый контракт образовательного контента Nexus`

Сохранять feature history/PR как evidence failed experiments и архитектурного self-review.

## После merge

Не выполнять автоматический runtime cutover. CP-1.1 остаётся data-contract foundation. Следующий bounded milestone определяется MASTER отдельно.
