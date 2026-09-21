# AKRONIKL IT NEXUS v0.1.4-alpha.2

## OOP Runtime Compatibility

Этот hotfix не меняет содержание трёх benchmark-уроков. Он исправляет образовательную интерпретацию ошибок Nexus Sandbox для современного C++.

### Изменения

- Статический анализ, условия задания и фактический Runtime показываются как отдельные состояния.
- Browser Runtime получил capability inspection для классов, наследования, `virtual`, `override` и других расширенных конструкций.
- Ошибка parser на best-effort-возможности больше не называется автоматически ошибкой программы ученика.
- Добавлен безопасный временный compatibility retry для `override`.
- Self-test теперь отдельно проверяет базовый console runtime и OOP capability.
- Технический вывод по-прежнему доступен для обучения чтению diagnostics.

### Ограничение

Browser Runtime остаётся лёгким provider. Полноценный современный C++, multi-file build и будущий Project Studio требуют расширенного WASM или Secure Build provider. Интерфейс Nexus Sandbox для пользователя останется единым.
