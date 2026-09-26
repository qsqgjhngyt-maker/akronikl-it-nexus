# Как загрузить WORK05 на GitHub

Этот архив — **GITHUB OVERLAY**.

1. Распаковать поверх текущего репозитория.
2. Сохранить структуру `docs/ru`, `docs/en`.
3. Не добавлять реальные provider secrets, SMS credentials, TOTP keys или Nexus tokens.
4. Runtime/version badge не менять.
5. Commit:

```text
docs: complete v0.1.7-alpha.2.3 WORK05 identity and security design
```

6. Push в `main`.

WORK05 — design package. Он не включает работающую Yandex/Google/Apple/phone авторизацию и не требует нового application release.
