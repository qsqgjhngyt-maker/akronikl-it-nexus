# AKRONIKL IT NEXUS v0.1.4-alpha.2.1

## OOP Live Provider-Limit Classification Hotfix

Повторная live-проверка `v0.1.4-alpha.2` показала: двухуровневый self-test корректно сообщал `base passed · OOP best-effort`, но после запуска корректного modern OOP-примера Browser Runtime мог показать красную «Ошибка выполнения», если первичный parser failure на `override` переходил во второй внутренний runtime failure после безопасного retry.

В `v0.1.4-alpha.2.1` этот сценарий закрыт:

- неудачный safe compatibility retry сохраняет статус **ограничения provider**, а не ошибки кода ученика;
- при provider-limit Nexus не подсвечивает строку исходника как ошибочную;
- технический вывод показывает обе попытки: исходный Browser Runtime failure и compatibility retry;
- исходный код ученика не изменяется;
- содержание трёх benchmark-уроков не меняется.

После публикации требуется повторный live-smoke OOP Sandbox. Только после PASS Nexus Lesson Standard 1.0 переводится из `candidate-final` в `Normative Production`.
