# AKRONIKL IT NEXUS — CP-1.1 Content Contract Foundation

**Release Notes (подготовлено к публикации).**  
**База:** Alpha10.3.1, main `0f71bb9f8752a34040ccb007acb2efcb89d8e36a`.  
**Публикация:** не выполнена, ожидает отдельного разрешения владельца.  
**PR:** https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/14

## Что добавлено

- Единый контракт пакета курса `Course → Module → Topic → Skill → Exercise / Practice / Project`.
- Универсальная JSON Schema и семантический валидатор C++.
- Stable ID bindings к существующим 6 модулям, 40 темам, 40 упражнениям, 6 практикумам и 7 проектам.
- 15 подтверждённых reference skills из трёх эталонных уроков. Для 37 остальных тем mapping остаётся `pending-cp3`.
- Контроль alias `cpp.const-correctness → cpp.const.correctness`.
- Автоматические проверки контракта, Академии, Studio, Offline/PWA и Cloud Sync, evidence/SHA-256.
- CI-проверки при PR и после merge в `main` для CP-1.1 файлов.

## Совместимость

Все изменения additive-only. Существующие C++ материалы, UI/runtime, ключи пользовательского прогресса, legacy migration, PWA/offline и серверные Identity/Cloud Sync contracts не изменяются.

Новый contract index пока не используется runtime. Skill Graph, Learning Events и Mastery Model остаются **NOT IMPLEMENTED**.

## Следующее развитие

После отдельного архитектурного решения — CP-2 Schemas/Validators expansion, CP-3 Skill Graph mapping, затем Learning Events и Mastery. Массовое производство контента не входит в CP-1.1.

## Доказательства

Фактический GitHub Actions run и хеш финального кандидата добавляются в PR по завершении повторной проверки. Не выдавать PR CI за независимую проверку ветки 05 или за LIVE PASS.
