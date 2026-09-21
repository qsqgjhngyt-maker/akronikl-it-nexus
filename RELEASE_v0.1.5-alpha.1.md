# AKRONIKL IT NEXUS v0.1.5-alpha.1

## Nexus Polyglot Runtime Foundation

Первый релиз после принятия Nexus Lesson Standard 1.0 как **Normative / Production**.

Главная задача версии — не добавить ещё один C++ workaround, а убрать C++-специфичность из ядра исполнения перед масштабированием блока «Программирование».

### Реализовано

- language-neutral Runtime Provider Contract;
- Nexus Runtime Router;
- явный `languageId` в runtime request;
- capability states `guaranteed / best-effort / unsupported`;
- автоматический выбор provider;
- явный fallback, если предпочтительный provider пока недоступен;
- route indicator в Nexus Sandbox;
- реестр 24 основных языковых треков;
- C++ Browser Runtime сохранён как быстрый provider;
- WASM C++ provider получил Worker/lifecycle foundation;
- Secure Build описан как общий polyglot tier;
- исправлена ложная детекция `main()` как конструктора;
- Service Worker кэширует новые runtime-core assets.

### Что намеренно НЕ заявляется

`v0.1.5-alpha.1` ещё не содержит полноценного Modern C++ compiler в WASM. `wasm-cpp` остаётся недоступным для реального запуска и честно сообщает `compilerReady: false`.

Следующий этап: **`v0.1.5-alpha.2 — Modern C++ Compiler Integration`**.

### Programming language tracks

На уровне архитектуры и каталога зарегистрированы: C, C++, Rust, Python, Java, C#, Go, JavaScript, TypeScript, Kotlin, Swift, Dart, PHP, Ruby, Scala, Bash, PowerShell, R, Julia, Lua, 1С:Предприятие, Assembly, Fortran и Perl.

Это не закрытый перечень. Новые языки подключаются без изменения Runtime Router.

### Compatibility

- C++ benchmark content unchanged;
- 40 stable lesson IDs unchanged;
- legacy indices `0…39` unchanged;
- legacy progress key preserved;
- current Browser Runtime remains available for lightweight C++ exercises.
