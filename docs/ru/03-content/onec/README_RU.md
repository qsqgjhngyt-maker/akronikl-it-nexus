# 1С EDUCATION — кандидат двух траекторий A1/P1

Решение владельца/MASTER 00: 30.10.2026. Рабочая область: 03 CONTENT PRODUCTION. База разработки: `d8721e06a2b1ac953aa18694c07559c62d388700`. Это актуальный main после P4-Q, а не устаревший сентябрьский frontend snapshot. Опубликованный C++ Gold Standard 1.0 сохраняется.

**Статус: IMPLEMENTED / AUTOMATED PASS в пределах кандидата. Общая приёмка: PARTIAL.** Main, production и существующие runtime/UI/Identity contracts не изменены. Слияние и официальный выпуск не поручались.

## Что реализовано

- Самостоятельный P: Course ID `onec`, язык `onec`, существующие aliases `1c`,`bsl`, расширения `.bsl`/`.os`. Полная программа P1–P12: 48 стабильных Topic ID.
- Самостоятельный A: Course ID `1c-enterprise`. Полная программа A1–A8: 32 стабильных Topic ID.
- Первые модули: 4 полноценных урока A1 и 4 P1, каждый RU/EN, всего 16 локализованных payload. Остальные 72 темы имеют PLANNED и не содержат фальшивых готовых уроков.
- Общий версионированный справочник/диаграммы/предпосылки v1 без переноса completion между курсами. Schema CP-1.1 остаётся побайтно прежней; два новых пакета проходят её generic validator.
- Проверяемый изолированный UI кандидата, вопросы и история попыток, отдельный локальный самоотчёт по каждому курсу, заметки проекта и безопасное копирование с новым ID/provenance без переноса прогресса.
- Оригинальная минимальная конфигурация и BSL, реальное исполнение официальной платформой, backup/restore и отрицательный синтаксический контроль.
- Автономный пакет теории/моделей/самопроверки с исходниками лабораторной. Платформа 1С и чужие конфигурации не включаются.

## Как открыть для проверки

Из корня checkout запустите любой локальный статический сервер, привязанный к loopback. Откройте:

`/courses/onec-education/index.html#course=1c-enterprise`

`/courses/onec-education/index.html#course=onec`

Открытие HTML двойным щелчком в исходниках не заменяет сервер: браузер может запрещать ESM/fetch. Для автономного открытия создайте пакет:

```text
node tools/build-onec-offline.mjs НОВЫЙ_КАТАЛОГ_ПАКЕТА
```

Затем откройте `onec-offline.html` в этой папке. Сборщик отказывается использовать существующий каталог. Прогресс file-origin автономного пакета отделён от прогресса loopback-origin. Автоматический перенос и облачная синхронизация пока не реализованы; исходные данные не удаляются.

## Где находятся данные

`courses/onec/{manifest,curriculum,content-package}.json` и `courses/1c-enterprise/{manifest,curriculum,content-package}.json` — канонические структуры. Учебные тексты находятся только в собственных `lessons/ru` и `lessons/en`. Общие определения — `courses/onec-education/shared.v1.json`; проект — `service-desk.v1.json`; источники — `sources.v1.json`.

Локальные ключи кандидата: `akronikl:it-nexus:onec-candidate:v1:onec` и `akronikl:it-nexus:onec-candidate:v1:1c-enterprise`. Это отдельный кандидат, не приватный account-storage runtime. В рабочий аккаунт или Learning Events эти данные не пишутся. Основные state, legacy C++ и Project Studio не мигрируют.

## Проверки

```text
node tools/check-onec-regression.mjs
node --test tests/onec-content.test.mjs
node tests/onec-browser.mjs
```

Для браузерного теста задайте путь `NEXUS_PLAYWRIGHT_MODULE` к Playwright 1.62.1, а при использовании установленного Chrome — `NEXUS_CHROME_PATH`. `ONEC_EVIDENCE` и `ONEC_REGRESSION_EVIDENCE` направляйте в новые папки вне checkout. Новый workflow выполняет те же проверки без deployment permissions.

Нативная лабораторная: `courses/onec-education/native/README_RU.md`. Она требует уже установленную официальную платформу и новый каталог эксперимента. Платные ресурсы и сервер не нужны.

## Что ещё не принято

Активные маршруты `#course=onec` и `#course=1c-enterprise` в основном приложении, приватный прогресс аккаунта, Cloud Sync, включение в действующий SEC-PWA-контур и Project Studio adapter требуют отдельного согласования 00/02/07/01. Кандидат не меняет существующие карточки PLANNED на AVAILABLE. Полные EULA community/EDT и точной training-поставки имеют перечисленные в аудите пробелы. Физические Android/iPhone, Safari/WebKit и независимая предметная рецензия — NOT RUN.

Открывать новые runtime/provider contracts в этой ветке без маршрутизации запрещено. Следующий шаг — приёмка этого конкретного кандидата и согласование интеграции, затем последовательная разработка A2/P2.
