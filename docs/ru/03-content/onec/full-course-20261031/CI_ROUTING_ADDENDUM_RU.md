# Отделение содержания от исторических выпусков C++

Изменение общего writer активировало не только прежний P4-Q publication workflow, но и M1/M2 content/preflight workflows по core/app.js. Их прямой запуск потребовал историческую feature/academy-gold-standard-cpp-module-4 и отказал до проверки 1С. Это не новый выпуск 1С и не обнаруженная ошибка учебного BSL.

Решение: тот же trusted router и immutable bootstrap scope выбирают content-review для exact-approved кандидата. Исторические jobs M1 gold-gate и M2 preflight/module2-gold/module1-regression получают needs: content_scope и условие historical-release. Все прежние steps/assertions/таймауты/permissions/triggers сохраняются; побайтное сравнение после удаления только двух строк охраны проверяется unit test. Для неизвестного protected изменения остаётся historical-release и весь прежний путь.

Bootstrap pin единственный, в прежнем publication workflow. Новые два workflow читают ровно 40hex из этого Git object, проверяют форму, исполняют router из trusted commit, а не HEAD; scope проверяет 31 точный path/mode/hash, в том числе оба workflow целиком. При изменении bytes без нового доверенного scope маршрут FAIL. Никакой release receipt, allowlist, required gate или публикационный шаг не заменяется contentPASS.

Content-review дополнительно запускает полную текущую регрессию 37 групп/139unit; отдельный 1С CI даёт 38browsergroups. Старые C++runtime/source packs и 378 файлов активного опубликованного поколения сохранены в проверенной preview. Новый C++compile/полный исторический LIVE автоматически не приписывается этому кандидату.

Проверено локально: YAMLparse, отдельные тесты legacy bytes/trusted routing/tamper, 15startup/stream checks; deterministic producer test повторён с его установленной esbuild0.28.2 после ошибки отсутствующего локального пакета. Actual GitHub route, skip и CI будут зафиксированы по финальному HEAD в описании PR63. Административные required-check settings не проверены. Main/production/merge не выполнялись.
