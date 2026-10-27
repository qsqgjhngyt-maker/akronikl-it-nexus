# H1 — план версионированного Model Adapter Bridge

Дата: 27.10.2026. Статус: PLANNED, совместимость изучена по исходникам принятого AK-P4. Реализация — отдельный milestone, не часть P4-C.

## Фактическое различие

`akronikl/core/model-api.js`: registry.generate принимает providerId/prompt/context/signal/allowLocal, передаёт адаптеру `{schemaVersion:1,modelId,prompt,context}` и ожидает `{text}`. Внешние адаптеры отклоняются.

`akronikl/tutor/session.js`: in-process provider.generate принимает messages/allowedCitations/signal/onProgress и возвращает `{answer,citations}`. Источники и разрешения получает Tutor. `connections/controller.js` владеет runtime и выдаёт отзываемый lease. Одного переименования providerId недостаточно.

## Целевой внутренний запрос

`schemaVersion:1, purpose:tutor|companion, requestId, contextRevision, personalityRevision, locale, messages, evidenceRefs, allowedCitations`. Метаданные только из доверенного host. AbortSignal и числовой onProgress остаются отдельными runtime-аргументами, не сериализуются. Объект не содержит секретов, сетевых URL, прав администратора и произвольного перечня tools.

Результат: `schemaVersion, requestId, text, citations, provenance, limitations, metrics`. Provenance различает generated-tutor/generated-companion. Неизвестные поля, tools/actions и произвольные ссылки отвергаются; инструментальные операции остаются отдельным Core-путём. Метрики отсутствующего измерения — null, не ноль.

## Последовательность реализации

1. Зафиксировать JSON-data validators, лимиты и набор capability descriptors адаптера. Версии/лицензии/формат и transport проверяются независимо от имени модели.
2. Сделать локальный wrapper существующего Wllama/Tutor без изменения весов, sampling и runtime; сохранить shape проверенного ответа и lifetime lease.
3. Сделать wrapper Core v1: старый `{text}` не получает выдуманные citations. Core-операции без источников не маркируются как grounded Tutor.
4. Развести purpose: Tutor сохраняет evidence gate и ссылки; Companion допускает отсутствие учебных citations, но не выдумывает сведения об аккаунте, коде и фактах курса. До отдельного quality gate режим не показывается готовым.
5. Проверить отмену на закрытии, изменении revision/настроек, блокировке, переключении моделей. По умолчанию начать новый разговор; перенос контекста требует отдельного согласия и ещё не реализуется H1.
6. Выполнить conformance на fake-adapter, затем настоящий Wllama, затем браузерные Account/offline-регрессии и 32-case quality corpus. Факт сериализации не означает качество.

## Критерии допуска

Старые публичные API работают без расширения прав. Поведение без модели и запуск Nexus не зависят от bridge/runtime. Тесты отвергают неизвестную версию, wrong purpose, чужую цитату, stale revision, просроченный lease, поздний output, fake progress и попытку инструментального действия. Сравниваются реальные ответы и latency; не заявляется совместимость по одному JSON-формату.

H2–H5 (установки/загрузка/несколько моделей/BYOK) остаются последующими этапами. В H1 нет proxy, ключей пользователя, облачных платных вызовов и автоматического fallback.
