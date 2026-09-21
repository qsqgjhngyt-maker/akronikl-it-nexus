# Architecture Delta — v0.1.2-alpha.4.1

## Nexus Glass Dropdown

Верхняя языковая/FX-панель больше не зависит от нативного `<select>` браузера.

Добавлен модуль `core/glass-select.js`, который предоставляет единое поведение dropdown-компонентов:
- `role=listbox` / `role=option`;
- `aria-expanded` / `aria-selected`;
- управление мышью, touch и клавиатурой;
- закрытие по `Esc`, клику вне меню, scroll/resize;
- внутренний scroll для длинных списков локалей;
- динамический источник языков остаётся `locales/registry.json`.

Это визуальная/UX-замена без изменения модели предпочтений, прогресса, курсов или Sandbox.
