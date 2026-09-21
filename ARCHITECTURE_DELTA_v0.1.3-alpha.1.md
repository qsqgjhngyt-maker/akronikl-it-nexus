# Architecture Delta — v0.1.3-alpha.1

## Interactive Memory Model

Добавлен независимый UI-модуль `core/memory-lab.js`. Он получает lesson-local модель данных и визуализирует семантические связи объекта, адреса, указателя, разыменования и ссылки. Адреса намеренно символические, чтобы не смешивать модель языка C++ с физической памятью конкретного браузера.

## Content model

Benchmark может содержать `interactiveMemory`, а `labels` позволяет переопределять заголовки секций под конкретную тему без хардкода в ядре.

## Localization

`cpp.pointers-references-addresses` теперь имеет полноценные RU/EN тела под одним stable ID и общим прогрессом.

## Sandbox boundary

Практический код урока использует базовые raw pointers, доступные Browser Runtime. Ссылки, lifetime и более сложные конструкции дополнительно объясняются интерактивной моделью до появления расширенного WASM/secure compiler provider.
