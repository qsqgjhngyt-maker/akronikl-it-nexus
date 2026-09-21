# Architecture Delta — v0.1.5-alpha.1

## Nexus Polyglot Runtime Foundation

`v0.1.5-alpha.1` переводит Nexus Sandbox с C++-ориентированного provider registry на **language-neutral Runtime Core**.

### 1. Runtime request

Язык теперь передаётся явно:

```text
languageId + source + stdin + files + metadata
```

Core Router не определяет семантику конкретного языка и не содержит hardcoded-ветки «если C++».

### 2. Provider contract

Добавлен `sandbox/provider-contract.js`:

- нормализация runtime request;
- `guaranteed / best-effort / unsupported`;
- проверка поддержки `languages[]`;
- contract validation;
- единая форма результата выполнения.

### 3. Runtime Router

Добавлен `sandbox/runtime-router.js`. Router сравнивает capabilities и доступность providers и выбирает лучший готовый runtime.

Если лучший provider уже известен архитектуре, но ещё не подключён, Router может использовать доступный fallback с явной причиной `preferred-provider-unavailable-fallback`.

### 4. Language Registry

Добавлен `sandbox/languages.js` и `courses/programming/languages.json`.

Зафиксированы 24 основных языковых трека. C++ — reference implementation, а не ограничение ядра.

### 5. WASM foundation

`wasm-cpp` получил lifecycle/Worker foundation. Worker умеет capability probe и честно сообщает `compilerReady: false`.

Это принципиально: `v0.1.5-alpha.1` **не притворяется**, что полноценный Modern C++ compiler уже интегрирован.

### 6. UI routing visibility

В Sandbox добавлен route indicator. Пользователь по-прежнему нажимает одну кнопку «Запустить», но может видеть:

- какой provider выбран;
- является ли запуск fallback;
- какой более подходящий provider ожидается.

### 7. Lesson Standard freeze

После live PASS `v0.1.4-alpha.2.2` Nexus Lesson Standard 1.0 переведён в **Normative / Production**.

### 8. Regression guarantee

Содержимое трёх benchmark-уроков, 40 stable lesson IDs, legacy indices `0…39` и ключ `cpp_programming_pdf_course_v1` не меняются.
