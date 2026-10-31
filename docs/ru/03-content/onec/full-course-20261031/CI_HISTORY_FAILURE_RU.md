# Первый CI полного кандидата: shallow checkout

HEAD2f8bf3a: content_scope трёх historical workflows SUCCESS, publication и четыре старых C++jobs SKIPPED как предусмотрено. В двух новых content_review jobs полный regression suite не получил старые Gitobjects: checkout по умолчанию был depth1. Собственный 1С workflow имеет depth0 и тот же regression suite прошёл.

Проблема→гипотеза: несколько preservation checks отказывают одновременно, хотя независимые content/native/store tests проходят; все упавшие группы читают принятые baseline SHA. Попытка: проверены реальные job124457365962/run41173883913 и 124457372661/run41173883882; checkout fetch-depth1 и шесть baseline-dependent FAIL. Причина: неполная история нового review job. Решение: fetch-depth0 в обоих content_review jobs, новый regression assert требует полную историю и у scope, и у review. Gate assertions/условия/старые команды/данные не удаляются и не ослабляются.

Новый scope закрепляет точные исправленные bytes; предыдущий полный scope сохранён в CI_SCOPE_2f8bf3a.json. Результаты повторного GitHubCI привязываются к новому HEAD в описании PR63. Это исправление CI окружения, не изменение курсов/нативного эталона/production.

Журналы новых content_review направлены в runner.temp: проверяемый checkout не получает посторонних generated evidence files. Новый assert проверяет и полный checkout, и это размещение. Продуктовый код/нативный набор/автономный пакет не менялись.

В промежуточном HEAD54afe67 два workflow были отклонены до запуска jobs: runner.temp помещён в job-level env. YAML синтаксис сам по себе не проверяет доступность GitHubcontexts. Исправлено на step.env; это доступно по официальной таблице[Contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts). Новый assert требует расположение env внутри step и отвергает прежний вариант. Исторические jobsteps/permissions/gates не менялись. Предыдущий scope сохранён в CI_SCOPE_54afe67.json.
