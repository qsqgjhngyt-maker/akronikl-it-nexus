# ADR-0011 — Language-neutral Polyglot Runtime Core

**Статус:** Accepted  
**Дата:** 2026-09-21

## Контекст

C++ benchmark выявил границы лёгкого JSCPP Browser Runtime. Одновременно блок «Программирование» должен развиваться как многолингвальная система с основными языками программирования.

## Решение

Runtime Router и provider contract становятся language-neutral. Язык передаётся явным `languageId`. Provider сам объявляет поддерживаемые языки и capabilities.

C++ не зашивается в ядро Router. Он остаётся reference implementation.

## Следствия

- можно подключать Python, Java, C#, Rust, Go и другие языки без переписывания Sandbox;
- один UX сохраняется для уроков, лабораторий и Project Studio;
- тяжёлые toolchains подключаются лениво через WASM или Secure Build;
- provider limitation отделяется от ошибок learner source;
- тесты обязаны проверять routing независимо от конкретного языка.
