# Requirements Governance — v0.1.7-alpha.2.3

## 1. Источник истины
Русская версия требований нормативна. Английская — синхронизированное зеркало. При расхождении до исправления действует RU.

## 2. Неизменяемость ID
После публикации ID не переиспользуется для другого смысла. При существенном изменении семантики создаётся новый ID, старый получает `SUPERSEDED/DEPRECATED` с ссылкой.

## 3. Изменение требования
Изменение должно содержать:
- reason/source;
- affected architecture/data/API;
- affected tests;
- migration/backward compatibility при необходимости;
- обновление RTM.

## 4. Definition of Ready
Feature готова к реализации, если:
- есть requirement ID;
- определены actor/value/boundary;
- есть acceptance criteria;
- понятен security/privacy impact;
- для архитектурного изменения есть ADR или явно указано, что ADR не нужен;
- для AI есть baseline/evaluation plan.

## 5. Definition of Done
Feature считается закрытой, если:
- код реализован;
- automated tests пройдены;
- при критичном пользовательском потоке выполнен LIVE test;
- RTM обновлена;
- docs/changelog/journal обновлены;
- evidence сохранено;
- secrets отсутствуют в артефактах.

## 6. Verification methods
`CODE`, `AUTOTEST`, `LIVE`, `SECURITY_TEST`, `EXPERIMENT`, `REVIEW`. Один requirement может иметь несколько методов.

## 7. AI-specific rule
Наличие LLM-ответа не является доказательством качества. AI requirement закрывается только через заранее определённую evaluation procedure.
