# Просмотр и review эталонов

Локальный адрес действует только на ПК Work/владельца. Он не доступен MASTER удалённо. Никакой публичный preview не создаётся. Точная финальная команда запуска и receipt должны сопровождать этот документ; порт47715 предназначен окончательной сборке.

Просмотр `/pilot` использует тот же renderer и исходные lesson IDs. Сохранение и запуск в нём отключены штатно, пока нет допустимого аккаунта/личной копии. Вход, рабочие данные и фиктивный серверный session не подключаются. Полный интерфейс с боковыми панелями проверяется через настоящий core/app с отдельными синтетическими QA-данными. Для практики C++ нужна своя штатная локальная учебная копия/вход; для1С — отдельная установленная учебная база с доступной лицензией. Браузер не исполняет BSL.

## Точные маршруты

- `cpp.programming-process`: [RU](http://127.0.0.1:47715/pilot#course=cpp&lesson=cpp.programming-process&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=cpp&lesson=cpp.programming-process&locale=en&stage=explanation&learningRoute=reference-start)
- `cpp.first-cpp-program`: [RU](http://127.0.0.1:47715/pilot#course=cpp&lesson=cpp.first-cpp-program&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=cpp&lesson=cpp.first-cpp-program&locale=en&stage=explanation&learningRoute=reference-start)
- `cpp.data-types`: [RU](http://127.0.0.1:47715/pilot#course=cpp&lesson=cpp.data-types&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=cpp&lesson=cpp.data-types&locale=en&stage=explanation&learningRoute=reference-start)
- `cpp.variables-scope`: [RU](http://127.0.0.1:47715/pilot#course=cpp&lesson=cpp.variables-scope&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=cpp&lesson=cpp.variables-scope&locale=en&stage=explanation&learningRoute=reference-start)
- `onec.p1.architecture`: [RU](http://127.0.0.1:47715/pilot#course=onec&lesson=onec.p1.architecture&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=onec&lesson=onec.p1.architecture&locale=en&stage=explanation&learningRoute=reference-start)
- `onec.p1.lifecycle`: [RU](http://127.0.0.1:47715/pilot#course=onec&lesson=onec.p1.lifecycle&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=onec&lesson=onec.p1.lifecycle&locale=en&stage=explanation&learningRoute=reference-start)
- `onec.p2.topic-1`: [RU](http://127.0.0.1:47715/pilot#course=onec&lesson=onec.p2.topic-1&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=onec&lesson=onec.p2.topic-1&locale=en&stage=explanation&learningRoute=reference-start)
- `1c-enterprise.a2.topic-1`: [RU](http://127.0.0.1:47715/pilot#course=1c-enterprise&lesson=1c-enterprise.a2.topic-1&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=1c-enterprise&lesson=1c-enterprise.a2.topic-1&locale=en&stage=explanation&learningRoute=reference-start)
- `1c-enterprise.a2.topic-2`: [RU](http://127.0.0.1:47715/pilot#course=1c-enterprise&lesson=1c-enterprise.a2.topic-2&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=1c-enterprise&lesson=1c-enterprise.a2.topic-2&locale=en&stage=explanation&learningRoute=reference-start)
- `1c-enterprise.a2.topic-3`: [RU](http://127.0.0.1:47715/pilot#course=1c-enterprise&lesson=1c-enterprise.a2.topic-3&locale=ru&stage=explanation&learningRoute=reference-start) · [EN](http://127.0.0.1:47715/pilot#course=1c-enterprise&lesson=1c-enterprise.a2.topic-3&locale=en&stage=explanation&learningRoute=reference-start)

## Сценарий учащегося

1. Назовите цель и то, что уже должно быть известно. Прочитайте первый небольшой блок.
2. Откройте выделенный термин, найдите его синоним, закройте Escape и вернитесь к месту.
3. Предскажите вывод до чтения результата; объясните каждую новую конструкцию.
4. Измените одно условие/значение и объясните новое наблюдение. Исправьте указанную ошибку.
5. Выполните самостоятельную задачу на новых данных. Сравните ожидаемое с фактическим; сохранение файла не означает проверку.
6. Пройдите основную кнопку объяснение → самопроверка → практика → следующий урок. Вернитесь и проверьте свою работу. В последнем уроке откройте обзор маршрута.
7. Запишите без персональных данных: непонятное слово, место затруднения, потребовавшуюся помощь, получилось ли найти продолжение. Reviewer notes скачиваются отдельно от прогресса.

Оценка тестировщика: смог ли человек без подсказки понять, куда нажать после этапа/урока. Work самостоятельно этот пользовательский критерий не закрывает. Технический PASS не заменяет понимание.


Одна команда из корня репозитория (Node.js24 и готовая сборка в соседнем каталоге):

```powershell
node tools/preview-cpp-clarity.mjs --frontend "..\..\reference-courses-20261112\frontend-candidate-8" --pilot --port 47715
```

Для воспроизводимой сборки: установить закреплённые server-access зависимости, задать NEXUS_FRONTEND_DIR на новый пустой каталог и выполнить `node tools/build-cpp-clarity-candidate.mjs`. NEXUS_FRONTEND_DIR не должен указывать на production или рабочую папку пользователя. Использовать точный исходный SHA из FILE_BINDINGS/CI_FINAL_RESULT. Готовая сборка и просмотр не включают1С,серверную сессию и чужие данные.
