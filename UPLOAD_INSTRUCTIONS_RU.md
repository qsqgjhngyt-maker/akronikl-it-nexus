# AKRONIKL IT NEXUS v0.1.1-alpha.3 — Runtime Completeness Fix

Диагностика GitHub Pages показала, что часть обязательных runtime-файлов не была загружена в репозиторий.

## Что обнаружено отсутствующим

- `core/i18n.js`
- `core/migrations/cpp-v7.js`
- `akronikl/context.js`
- `locales/registry.json`
- `locales/ru/ui.json`
- `locales/en/ui.json`
- `courses/catalog.json`

Из-за этого `core/app.js` не мог завершить ES-module import/bootstrap.

## Что делать

1. Распаковать ZIP.
2. Загрузить **всё содержимое** архива в корень `akronikl-it-nexus`, сохраняя структуру папок и заменяя существующие файлы.
3. `UPLOAD_INSTRUCTIONS_RU.md` в GitHub загружать необязательно.
4. После коммита дождаться зелёного GitHub Pages deployment.
5. Открыть `https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/?v=0.1.1-alpha.3`.

Пакет содержит полный набор boot-critical runtime-файлов, а не только семь отсутствовавших файлов, чтобы исключить повторную неполную загрузку.
