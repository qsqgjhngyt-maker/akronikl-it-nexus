> **Основной язык документации: русский.** Русская версия является нормативной. Английская версия поддерживается как вторичное зеркало для международных пользователей.

# QA Strategy

## Слои контроля
1. **Baseline gate** — до изменений.
2. **Static gate** — syntax, schema, resource paths, duplicate IDs.
3. **Content gate** — обязательные секции, уникальность, качество, источники.
4. **Runner gate** — компиляция/выполнение примеров, где возможно.
5. **Browser gate** — навигация, progress, labs, PWA update.
6. **Mobile gate** — iPhone/Android, memory, viewport, touch.
7. **AI gate** — контекст, fallback, отказоустойчивость, отсутствие secret leakage.
8. **Release gate** — backup, manifest, hashes, changelog, regression report.

PASS автоматического стенда не равен PASS физического устройства. Непроверенное отмечается явно.
