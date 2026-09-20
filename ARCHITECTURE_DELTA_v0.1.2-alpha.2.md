# Architecture Delta v0.1.2-alpha.2

## 1. Learner-facing content vs provenance

Учебный UI больше не использует `pdfPages`/`pdfNotes`. Эти legacy-поля остаются внутренним provenance-слоем до отдельной миграции схемы данных. Benchmark 01 уже использует `provenanceRef` и не содержит PDF-метаданных в самом локализованном уроке.

## 2. Benchmark Standard 1.1

В эталон добавлены `glossary` и `sandboxModel`. Обязательный benchmark-check теперь проверяет 16+ разделов теории, 18+ терминов и отсутствие пользовательских PDF-отсылок.

## 3. Nexus Sandbox

Пользовательский слой отвязан от названия конкретного runtime: UI использует бренд `Nexus C++ Runtime`. Текущий provider остаётся JSCPP, поскольку он уже прошёл живой smoke-test в рабочем baseline. Добавлены self-test, retry после failed load и 20-секундный timeout. Provider можно заменить позже без изменения lesson schema.

## 4. Mobile input

Редактор и stdin получают `autocorrect=off`, `autocapitalize=off`, `autocomplete=off`. На узких экранах размер моноширинного текста повышается до 16 px, чтобы снизить риск автоматического zoom в мобильных браузерах.
