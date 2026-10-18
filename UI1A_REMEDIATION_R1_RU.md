# UI1A Release Gate 05 Remediation R1

Это минимальное продолжение принятого integration commit
`e22c9750e3ed3a19181e899bbc614864ba70c809` по акту 05 от 18.10.2026.

Версия: `0.1.7-alpha.2.4.6-ui1a.rc.1`. Public asset generation:
`releases/ui1a-rc1-20261018/`. Сборка выполняется штатным Node:

```
node tools/build-ui1a-release.mjs --out <новый-каталог>
```

Для release review используется собранный каталог, не исходный dev index.
Весь граф модулей, workers и CSS находится под generation path; root manifest
сохраняет прежние bytes `id/start_url/scope`. C++ content, stable IDs, VFS,
Project Studio store, Identity, Cloud Sync и runtime ABI не меняются.

Metadata/cache-key reuse исправлен для новых ресурсов. Полный VERSION/CACHE-001
не объявляется закрытым: существующий controller продолжает работать; частичное
обновление root HTML через старый worker может нарушить offline boot. Миграция
legacy worker требует 01. Proposed network-only worker не входит в source/build.

`pwa:false`, `serverPasskeyAccess:false`, `serverFeedback:false` сохраняются.
Слепой unregister/clear/deleteDatabase/cleanup не используются. Все data-preservation
проверки выполнены только в disposable profiles с синтетическими данными.
HTTPS/installability и физические Android/iPhone — NOT VERIFIED.

Release остаётся BLOCKED до повторной приёмки 05 и профильных решений 01/02/03.
Push/deploy/release и изменение production данным пакетом не разрешены.
