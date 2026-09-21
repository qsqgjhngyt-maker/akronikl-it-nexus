# Nexus Polyglot Runtime Architecture

**Статус:** Foundation / v0.1.5-alpha.1  
**Язык-норматив:** RU

## Решение

Nexus Sandbox является языково-нейтральной инженерной средой. Ядро Sandbox, Runtime Router и provider contract не должны содержать предположение, что единственный или главный исполняемый язык — C++.

C++ остаётся первым эталонным языком платформы и первым потребителем расширенного WASM runtime, но это не ограничение архитектуры.

## Поток выполнения

```text
Lesson / Lab / Project
        │
        ▼
 languageId + source + stdin + files + metadata
        │
        ▼
 Nexus Runtime Router
        │
        ├── Browser providers
        ├── WASM providers
        └── Secure Build providers
                │
                ▼
 stdout / stderr / exit code / diagnostics / artifacts
```

Пользователь нажимает одну кнопку **«Запустить»**. Выбор provider — обязанность платформы.

## Language Registry

`sandbox/languages.js` содержит стабильные language-neutral IDs и редакторские метаданные. Реестр расширяем без изменения Router.

На первом этапе зафиксированы основные направления: C, C++, Rust, Python, Java, C#, Go, JavaScript, TypeScript, Kotlin, Swift, Dart, PHP, Ruby, Scala, Bash, PowerShell, R, Julia, Lua, 1С:Предприятие, Assembly, Fortran и Perl.

Этот список не закрытый. SQL остаётся прежде всего частью направления «Базы данных», но может использовать тот же provider contract.

## Provider Contract

Каждый provider объявляет:

- `id`, `label`, `tier`;
- `languages[]`;
- `capabilities`;
- `available(request)`;
- `inspect(request)`;
- `run(request)`.

Стандартный runtime request:

```text
languageId
source
stdin
files
metadata
```

Provider оценивает запрос как:

- `guaranteed`;
- `best-effort`;
- `unsupported`.

Router выбирает лучший **доступный** provider. Если более подходящий provider уже известен, но пока недоступен, разрешён явный fallback на более слабую среду с маркировкой этого факта в UI.

## Runtime tiers

### Browser

Быстрый локальный запуск для простых упражнений. Не обязан реализовывать полный toolchain языка.

### WASM

Локальный расширенный runtime в изолированном Worker. Для C++ целевая интеграция: современный compiler + стандартная библиотека + virtual filesystem + WASI-compatible execution.

В `v0.1.5-alpha.1` реализован Worker/lifecycle foundation; сам Modern C++ compiler подключается следующим этапом.

### Secure Build

Будущий изолированный backend для multi-file, тяжёлых toolchains, тестов, build artifacts и Project Studio.

## Правило UX

Ученик не выбирает runtime вручную для обычного прохождения курса. Nexus показывает, какой provider выбран и почему, но маршрутизация остаётся автоматической.

Ограничение provider нельзя выдавать за доказанную ошибку исходного кода ученика.

## Mobile / performance

Тяжёлые runtime assets загружаются лениво. Browser provider не должен заставлять телефон загружать compiler/WASM, если задача выполняется лёгкой средой.

WASM compilation выполняется вне UI thread через Web Worker.

## Следующий этап

`v0.1.5-alpha.2 — Modern C++ Compiler Integration` должен превратить `wasm-cpp` из foundation/provider candidate в реально доступный provider и пройти эталонный тест на `<string>`, STL, OOP, RAII и smart pointers.
