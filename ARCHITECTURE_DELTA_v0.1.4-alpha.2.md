# Architecture Delta — v0.1.4-alpha.2

## OOP Runtime Compatibility & Capability Diagnostics

Версия отделяет три независимых результата Nexus Sandbox:

1. **Статический анализ Nexus** — базовая форма исходника и известные учебные требования.
2. **Проверка задания** — наличие ожидаемых конструкций темы.
3. **Runtime provider** — фактическая возможность текущего execution provider разобрать и выполнить программу.

Статический анализ не объявляется полноценным компилятором. Если лёгкий Browser Runtime не может разобрать конструкцию из своего best-effort-набора (классы, наследование, virtual/override и другие расширенные возможности), Nexus больше не выдаёт это автоматически за ошибку ученика.

### Provider capability model

`browser-runtime.js` теперь умеет инспектировать исходник и отмечать возможности как `guaranteed` или `best-effort`. Текущий Browser Runtime гарантируется только как быстрый учебный console provider. Расширенное современное C++ остаётся целью WASM / Secure Build providers.

### Safe compatibility retry

Если лёгкий parser падает на корректно используемом `override`, Nexus один раз повторяет выполнение на **временной копии** исходника без `override`. Исходный код ученика не изменяется. Удаление `override` не меняет intended virtual-dispatch semantics корректного переопределения; оно убирает только compile-time annotation, которую старый parser может не понимать.

Nexus не удаляет `virtual`, не переписывает иерархии и не применяет преобразования, меняющие семантику программы.

### Self-test

Кнопка «Проверить среду» теперь выполняет два уровня:

- базовый console/stdout probe;
- отдельный OOP capability probe.

Провал OOP probe не делает базовую среду «сломавшейся»: пользователь получает статус `base passed · OOP best-effort`.

### Future routing

UI Sandbox остаётся единым. Следующие providers должны подключаться через тот же router и capability contract, чтобы Project Studio и курсы не зависели от конкретного движка исполнения.
