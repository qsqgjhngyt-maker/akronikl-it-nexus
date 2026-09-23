# GitHub publish guide — v0.1.7-alpha.2.2.1

## Что коммитить в репозиторий
Коммитим **GITHUB_REPO_OVERLAY**: Markdown/TXT документацию и оптимизированные WebP-доказательства в `docs/evidence/...`.

Это полезно для истории разработки и будущей дипломной работы: доказательства связаны с конкретным релизом и доступны рядом с кодом.

## Что НЕ коммитить в git history
Не кладём в обычное дерево репозитория:
- FULL/PATCH/COMPLETE ZIP;
- архив оригинальных скриншотов;
- `BOOTSTRAP_SECRET`;
- полный `nxk_...` token;
- любые будущие крупные бинарные build artifacts.

Архивы лучше прикреплять как **GitHub Release assets** к тегу `v0.1.7-alpha.2.2.1`. Так история Git не раздувается.

## Порядок
1. Распаковать `...GITHUB_REPO_OVERLAY.zip` поверх текущего репозитория с сохранением путей.
2. Проверить, что `docs/evidence/releases/v0.1.7-alpha.2.2.1/EVIDENCE_INDEX.md` открывает изображения.
3. Commit message: `docs: close Cloud Sync LIVE PASS evidence v0.1.7-alpha.2.2.1`.
4. Push и дождаться GitHub Pages deploy.
5. Создать/обновить GitHub Release для тега `v0.1.7-alpha.2.2.1`.
6. В описание Release вставить `RELEASE_NOTES_GITHUB_v0.1.7-alpha.2.2.1.md`.
7. Прикрепить файлы из `GITHUB_RELEASE_ASSETS`.

## Почему так
Несколько оптимизированных скриншотов в `docs/` — нормально и полезно. Большие архивы и оригинальные доказательные пакеты лучше хранить в Release assets, а не в каждой Git-ревизии.
