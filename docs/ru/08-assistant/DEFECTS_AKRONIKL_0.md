# AKRONIKL-0 — дефекты и ограничения первого кандидата

Дата: 26.10.2026. Все примеры чувствительных строк в тестах синтетические. Реальные ключи/сессии не использовались.

| ID | Проблема и причина | Исправление | Проверка |
|---|---|---|---|
| AK0-D01 | Getter/sparse `include` мог исполняться при Array iteration | Плотный массив с собственными data descriptors и ограниченным набором значений | Security: getter/sparse include |
| AK0-D02 | Произвольный CoreError.code мог отражать чувствительную строку | Allowlist кодов, неизменяемый code, финальная проверка own descriptor | Security: обычный/поддельный CoreError; Core: prototype forgery |
| AK0-D03 | Ошибка асинхронного provider после смены контекста возвращалась как текущая | Проверка boundary/epoch также в error path | Security: late rejection |
| AK0-D04 | Невалидный signal отклонялся после запуска authorize/context | Валидация до операции; нативный brand-check и регистрация | Security: invalid/fake signal |
| AK0-D05 | Язык наставника заменял язык материалов | Отдельный доверенный readCourseLocale | Core: RU mentor + EN course |
| AK0-D06 | Поиск без locale скрыто выбирал RU; отсутствующий пакет выглядел как отсутствие совпадений | После авторизации используется courseLocale; отсутствие пакета → unavailable | Core: EN default, missing locale; Security: no language fallback |
| AK0-D07 | Повторный пакет одного языка дублировал источники | Уникальность stats.locale при создании Core | Core: duplicate packages |
| AK0-D08 | Полный parseRuntimeError.raw включал compiler output других файлов | Выделяется только первичная строка выбранного файла/line/column; runtime — parsed explanation | Security: actual multifile parser/sentinel |
| AK0-D09 | Бросающие signal методы могли запустить чтение или выпустить raw error из cleanup | Нативные EventTarget методы; безопасная cleanup; options внутри try | Security: throwing fake / poisoned native signal / options getter |
| AK0-T01 | Первый общий запуск 63/65: fixture заменял полный host частичным override | Порядок объединения fixture исправлен; assertions сохранены | failed-initial-integration.tap → core-tests.tap 69/69 |

Первичные замечания D01…D09 возникли при независимом review и локальных отрицательных проверках до сохранения кандидата в feature-ветке. Финальные regression tests сохранены. Не все промежуточные диагностические выводы имеют отдельный файл: для них доказательство исправления — именованный тест в финальном TAP. Отдельно сохранён неуспешный общий запуск T01.

## Ограничения среды

- Прямой git clone через сетевой proxy был недоступен. Использованы GitHub API, зафиксированный commit и побайтовая проверка полученных исходников; итоговый remote tree строится на полном исходном дереве.
- Default Node test runner с дочерними процессами встречал EPERM. Все заявленные cases реально выполнены с `--test-isolation=none`, Node 24.22.1.
- Browser runtime/физические устройства не использовались. Node import и проверка отсутствия native network/storage не обозначаются как browser LIVE.

## Незакрытые продуктовые границы

UI wiring, event lifecycle в действующем приложении, offline resource delivery/PWA update, browser/mobile performance, i18n интерфейса, настоящие модели/голос/BYOK и персональная долговременная память относятся к последующим milestones. Существование контракта не доказывает реализацию этих возможностей.
