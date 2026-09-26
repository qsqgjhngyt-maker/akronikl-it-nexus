# Как загрузить WORK03 на GitHub

Этот ZIP является **GITHUB OVERLAY**, а не полной сборкой приложения.

1. Распаковать содержимое архива поверх текущего репозитория, сохраняя пути.
2. Проверить, что появились/обновились файлы в `docs/ru/02-architecture`, `docs/en/02-architecture` и `docs/*/09-audit`.
3. Не удалять runtime `v0.1.7-alpha.2.2.1` и не менять version badge.
4. Выполнить commit:

```text
docs: complete v0.1.7-alpha.2.3 WORK03 architecture baseline
```

5. Push в `main`.
6. После публикации GitHub не требуется новый application Release: WORK03 — документационный work package внутри ещё не закрытого `v0.1.7-alpha.2.3`.

## Не загружать как runtime replacement

Этот пакет не содержит нового `index.html`, JS runtime или новой версии приложения.
