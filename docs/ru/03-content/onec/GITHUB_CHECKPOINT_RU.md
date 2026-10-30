# GitHub checkpoint: PR #63

Кандидат: [draft PR #63](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/63), ветка `feature/onec-dual-gold-foundation-20261030`. Source commit: `10f0aab27c3b707a7beba86f0dc24d0e9cc1a526`. Tree: `f3f7e19b5d18f7be4b47069e492a74d2ecdd1313` — совпадает с локальным проверенным деревом. После этого снимка допускается только документационная фиксация текущих результатов; payload и executable source остаются теми же.

Новый CI 1С:

- [PR run 41085917304](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/41085917304): SUCCESS.
- [Push run 41085874227](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/41085874227): SUCCESS.
- PR artifact `onec-candidate-evidence`, ID `12990878482`, 817769 bytes, содержит regression/browser/offline evidence и скриншоты. Нативное evidence выполнялось локально на официальной установленной платформе и приложено в исходном PR.

**Общий PR не зелёный.** [Прежний C++/publication workflow 41085916096](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/41085916096) остановился на `AssertionError: P4-Q release branch` в `tools/p4q-release-scope.mjs:12`. В текущем main исторический P4-Q receipt допускает только `main` и `feature/akronikl-p4q-corpus-20261028`; новая 1С feature туда не входит. Workflow имеет contents:read; публикация production не выполнялась. Это конкретный release-routing blocker, не пропущенная ошибка и не доказанный FAIL старых C++ уроков. Прямые C++/Studio/PWA/Cloud regression в новом CI прошли.

Старый release scope/receipt/workflow не изменялись. Для будущей приёмки требуется решение 00/05 о bounded CI routing новых content-only кандидатов с сохранением исторических receipt hashes. Переименование 1С-ветки в разрешённую P4-Q ветку не является допустимым решением.

## Параллельный кандидат

Во время этой работы появился [draft PR #62](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/62), HEAD `3167f1d45c9ed235d3ed69ddee3338b153bb714a`, на той же базе. Он расположен в `authoring/onec/`, содержит программы 95 тем и по одному вводному уроку на траекторию, а native execution отмечает NOT RUN. Эта ветка его не меняла и не закрывала.

У PR #62 предлагаемый Course ID P — `onec-programming`, у #63 — `onec`; язык в обоих случаях `onec`, A — `1c-enterprise`. Файлового конфликта по текущему перечню нет, однако есть смысловой конфликт идентичности и двух источников curriculum/shared definitions. До активной интеграции MASTER должен выбрать и согласовать один программный Course ID, консолидировать методическую программу и определить сохраняемый source of truth. Прогресс кандидата и provenance нельзя молча переносить или обнулять.

Материал #62 может дополнять review по детализации будущих тем: Null/даты/локаль, составные типы, ТаблицаЗначений, безопасный режим, RLS, взаимоблокировки, перепроведение и конфликт-резолюция Git. Это review-пункты существующих широких тем #63, не объявленная реализация этих механизмов.

**Итог:** IMPLEMENTED/AUTOMATED PASS нового A1/P1-кандидата; общий milestone PARTIAL, merge/deploy отсутствуют. Следующий приоритет 00→05/02/07: согласовать единый кандидат, IDs и bounded integration/CI gates.
