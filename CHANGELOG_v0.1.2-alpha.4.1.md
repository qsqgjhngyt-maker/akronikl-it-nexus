# AKRONIKL IT NEXUS v0.1.2-alpha.4.1

## Nexus Glass Dropdown hotfix

Исправлен визуальный дефект верхней панели: системные выпадающие списки браузера давали яркий белый popup на тёмном Nexus Glass UI.

### Изменения
- Интерфейс / Курс / Akronikl / FX переведены с нативного `<select>` на собственный Nexus Glass Dropdown.
- Сохранена динамическая загрузка языков из `locales/registry.json`.
- Реализованы `role=listbox`, `aria-selected`, `aria-expanded`, клавиатурная навигация, Esc и закрытие по клику вне меню.
- Длинные списки локалей имеют внутренний scroll.
- На мобильных dropdown не зависит от системного оформления браузера.
- Новый модуль `core/glass-select.js` включён в PWA cache.
