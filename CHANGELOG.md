# CHANGELOG v0.1.6-alpha.1

- Added Nexus Code Studio Foundation above the existing Sandbox/Runtime Router.
- Added local C++ syntax highlighting with no external editor dependency.
- Added bracket matching, auto-indent, Tab/Shift+Tab indentation, find, undo/redo and caret line/column indicator.
- Added a Problems panel combining structural and runtime/compiler diagnostics while preserving their classifications.
- Clang `line:column` diagnostics are clickable and jump directly to the reported source position.
- Added language-neutral virtual Code Workspace model for future `.cpp/.h`, tests and Project Studio.
- Modern C++ Clang/WASI execution path remains unchanged from the v0.1.5-alpha.2.2 LIVE PASS baseline.
- Benchmark lesson bodies, stable IDs, legacy indices and progress migration remain unchanged.

# CHANGELOG v0.1.5-alpha.2.2

- Align Modern C++ compilation with the pinned YoWASP libc++/libc++abi build by adding `-fno-exceptions` to C++ compilation.
- Fix STL/OOP link failures that surfaced as unresolved `__cxa_allocate_exception` / `__cxa_throw` symbols.
- Explicit `try` / `throw` / `catch` is now reported as a provider capability limit instead of a learner-code error.
- Added regression coverage for ABI flag alignment and exception-capability diagnostics.
- Runtime Router, lesson bodies, stable IDs and legacy progress migration remain unchanged.

# CHANGELOG v0.1.5-alpha.2.1

- Fixed learner-visible escaped quotes in the RU/EN OOP benchmark starter and solution.
- Added regression coverage for executable sample escaping.
- Modern C++ compiler/router behavior unchanged.

# CHANGELOG v0.1.5-alpha.2

- Real on-demand `Nexus WASM C++ Runtime` integrated through pinned Clang/LLD + WASI.
- Modern C++ / STL / OOP now route to a real compiler instead of the lightweight Browser Runtime fallback.
- Dedicated Worker, lazy toolchain loading, progress UI, compiler/run timings, real line/column diagnostics and phase-specific safety timeouts.
- Learner source remains local to the browser; external delivery is used for pinned runtime assets only.
- Basic C++ stays on the fast Browser Runtime; Lesson Standard 1.0 and benchmark content remain unchanged.

# CHANGELOG v0.1.5-alpha.1

- Nexus Sandbox core is now language-neutral through an explicit `languageId`.
- Added Runtime Provider Contract and capability-normalized routing.
- Added Nexus Runtime Router with guaranteed / best-effort / unsupported selection.
- Added 24 planned Programming language tracks; C++ remains the current reference implementation.
- Added automatic UI route indicator showing selected provider and explicit fallback.
- Added isolated WASM Worker foundation; Modern C++ compiler assets are intentionally deferred to v0.1.5-alpha.2.
- Fixed constructor feature detection so ordinary functions such as `main()` are not misclassified as constructors.
- Nexus Lesson Standard 1.0 frozen as Normative / Production after the v0.1.4-alpha.2.2 live pass.
- C++ benchmark lesson bodies, stable IDs, legacy 0…39 indices, and legacy progress key remain unchanged.

# CHANGELOG v0.1.4-alpha.1

- Benchmark 03 OOP completed in RU/EN.
- Added interactive class/object/encapsulation/inheritance/virtual-dispatch model.
- Added object slicing, abstract classes, virtual destructor, composition guidance, and terminology.
- Added Nexus Lesson Standard 1.0 candidate-final documentation.
- No stable IDs or legacy progress keys changed.

# CHANGELOG

## v0.1.4-alpha.2.2
- Live-smoke hotfix for missing standard-library headers in the lightweight Browser Runtime.
- Known standard C++ headers/libraries reported as unavailable by the provider (for example `<string>`) are classified as `provider-limit`, not learner-code errors.
- Misspelled/non-standard headers remain normal errors and keep line/column diagnostics.
- Added regression coverage for both `<string>` provider limitation and `<strng>` learner error.
- Benchmark lesson content, stable IDs, legacy indices, and progress migration are unchanged.

## v0.1.4-alpha.2.1
- Live-smoke hotfix for OOP Browser Runtime classification.
- If the initial `override` parse fails and the safe temporary retry also fails inside the lightweight provider, Nexus now classifies the result as an environment/provider limitation instead of a learner-code error.
- Provider limitations no longer highlight a learner source line as erroneous.
- Technical output preserves both the primary Browser Runtime failure and the compatibility-retry failure.
- Benchmark lesson content, stable IDs, legacy progress migration, and task content are unchanged.


## v0.1.2-alpha.3 — Benchmark UX & Universal Sandbox Foundation

- Collapsible sidebar + mobile drawer and Focus Reading.
- Independent terminology drawer with search/context links.
- Nexus Glass + adaptive gold/silver particle field.
- Provider-based Sandbox, Browser Runtime compatibility adapter, live diagnostics and assignment checks.
- Nexus Project Studio architecture and ADR-0010.

# Changelog

## v0.1.2-alpha.2 — Benchmark 01 · Theory & Nexus Sandbox

- Benchmark Standard повышен до 1.1.
- «Прочитать спокойно» заменено на профессиональную структуру: «Фундаментальная теория → Системный разбор темы».
- Первый урок расширен до 16 разделов фундаментальной теории и словаря из 20 терминов/сокращений.
- Разъясняются IDE, CLI, I/O, compiler, linker, toolchain, runtime, process, OS, stdin/stdout/stderr и другие базовые понятия.
- Пользовательские отсылки к PDF удалены из интерфейса и учебного текста C++; source/provenance остаётся внутренним слоем.
- Кодовый блок оформлен как Nexus Sandbox: встроенный редактор, stdin/stdout, runtime self-test, сброс и очистка вывода.
- Для мобильного ввода отключены autocorrect/autocapitalize и увеличен размер шрифта редактора на узких экранах.
- RU/EN benchmark сохраняют один stable ID и общий прогресс.

## v0.1.2-alpha.1 — Benchmark Lesson 01

- Первый эталонный урок Nexus `cpp.first-cpp-program` доведён до Benchmark Standard 1.0.
- Добавлены полноценные RU/EN тела одного и того же урока со stable ID.
- Добавлены полная теория, toolchain model, line-by-line walkthrough, experiments, error cases, lab, deep check и Skill Graph.
- Для остальных 39 C++ тем сохраняется RU baseline fallback.
- Рабочий runtime baseline остаётся v0.1.1-alpha.3.


## v0.1.0-alpha.1 — Platform Shell

- Переведён проект из Foundation в implementation alpha.
- Добавлена настоящая стартовая страница `index.html` для GitHub Pages.
- Созданы независимые locale-контейнеры RU/EN и `_template` для будущих языков.
- Разделены языки интерфейса, курса и Akronikl.
- Добавлен каталог 53 дисциплин из Foundation.
- C++ v7 отображён как первый reference-course без копирования полного legacy-контента.
- 40 тем C++ получили стабильные language-neutral ID.
- Добавлена неразрушающая миграция localStorage `cpp_programming_pdf_course_v1`.
- Добавлен namespaced storage `akronikl:it-nexus:*`.
- Добавлен минимальный Akronikl Context Model без внешнего AI.
- Добавлен network-first service worker с быстрым обновлением shell.
- Добавлен PWA manifest и временный инженерный знак ANX.


## v0.1.2-alpha.4 — Visual & Reading Polish
- Рабочая глобальная навигация, collapsible lesson tools rail, усиленный Nexus Glass, depth particles и polishing режима чтения.

## v0.1.2-alpha.4.1
- Нативные системные `<select>` в верхней панели заменены на Nexus Glass Dropdown.
- Убраны светлые системные popup-меню Windows/Chromium на тёмном интерфейсе.
- Dropdown поддерживает мышь, touch, клавиатуру, Esc, закрытие по клику снаружи и прокрутку длинных списков локалей.
- Реестр языков остаётся динамическим: будущие локали подключаются без хардкода компонента.

## v0.1.4-alpha.2
- Sandbox now distinguishes learner-code problems from lightweight Browser Runtime capability limits.
- OOP capability probe and safe `override` compatibility retry added.
