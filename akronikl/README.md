# Akronikl — Offline-First Core

Ветка-владелец: **08 · INTELLIGENT ASSISTANT**. Версия внутреннего ядра: `0.1.0`.

Этот кандидат предоставляет библиотечное ядро, подготовленные знания и интерфейсы интеграции. Подключение к UI/bootstrap/PWA пока не выполнено. Модели и API-ключи для локальных возможностей не требуются.

```js
import { createAssistantCore, loadPreparedKnowledge } from './core/index.js';

// manifestDescriptor берётся из доверенного manifest конкретной версии.
// hostReader читает явно подготовленный локальный ресурс.
const knowledge = await loadPreparedKnowledge({
  descriptor: manifestDescriptor,
  readBytes: hostReader
});

// host использует реальные Account/ACL/route/editor contracts Nexus.
// Нельзя брать authorize/readBoundary из пользовательского JSON.
const core = createAssistantCore({ host, knowledge: [knowledge] });
const response = await core.invoke({
  capability: 'knowledge.search',
  input: { query: 'бинарный поиск', locale: 'ru' }
});
// response.sources — настоящие источники; текст отображается безопасным renderer.
// При смене аккаунта/урока/проекта/ревизии host меняет boundary и вызывает:
core.invalidate();
```

Это пример интеграционного контракта: `host`, `manifestDescriptor` и `hostReader` должен предоставить Nexus. Он не обещает готовое автоматическое подключение к странице.

Доступные структурированные операции:

| ID | Назначение |
|---|---|
| `assistant.capabilities` | Метаданные возможностей и провайдеров |
| `context.current` | Ограниченный текущий контекст |
| `knowledge.search` | Поиск в подготовленном индексе |
| `navigation.propose` | Предложение открыть настоящий урок |
| `model.generate` | Контракт доверенного локального адаптера; default off |

Произвольный диалог, реальная LLM, голос и внешние API ещё не подключены. Внешний provider в этом этапе безусловно отклоняется.

Проверено на Node 24.22.1:

```bash
node --test --test-isolation=none tests/akronikl-core.test.mjs tests/akronikl-knowledge.test.mjs tests/akronikl-security.test.mjs
node tools/build-akronikl-knowledge.mjs --check
node tools/check-akronikl-core-scope.mjs
```

[Архитектура](../docs/ru/08-assistant/ARCHITECTURE_AKRONIKL_0.md) · [Отчёт MASTER](../docs/ru/08-assistant/MILESTONE_AKRONIKL_0_2026-10-26.md) · [ADR](../docs/ru/08-assistant/ADR-AK0-001-OFFLINE_CORE.md) · [Дефекты и ограничения](../docs/ru/08-assistant/DEFECTS_AKRONIKL_0.md).
