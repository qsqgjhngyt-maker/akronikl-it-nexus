# Как загрузить WORK04 на GitHub

Этот архив — **GITHUB OVERLAY**.

1. Распаковать поверх текущего репозитория с сохранением путей.
2. Проверить появление `docs/ru/03-data`, `docs/en/03-data` и WORK04 audit files.
3. Не применять `TARGET_SCHEMA_DRAFT_DO_NOT_APPLY.sql` к D1.
4. Runtime и version badge не менять.
5. Commit:

```text
docs: complete v0.1.7-alpha.2.3 WORK04 data baseline
```

6. Push в `main`.

WORK04 не требует отдельного GitHub application release.
