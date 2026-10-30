# Evidence кандидата 1C-0 / A1 / P1

30.10.2026. Базовый SHA `d8721e06a2b1ac953aa18694c07559c62d388700`.

| Область | Результат | Артефакт |
|---|---|---|
| CP-1.1 + C++ + Studio + PWA + Cloud contracts | 20/20 групп PASS | evidence/REGRESSION_RESULT.json |
| Новая модель/контент | 12/12 unit PASS | evidence/ONEC_UNIT.txt |
| Существующий CP-1.1 | 10/10 unit PASS | evidence/CP11_UNIT.txt |
| Native BSL и restore | AUTOMATED PASS на 8.3.27.2214 | evidence/NATIVE_RESULT.json |
| Native из переносимого offline-комплекта | AUTOMATED PASS на той же сборке | evidence/NATIVE_PORTABLE_RESULT.json |
| Отказ перезаписи | существующий каталог отклонён, прежний результат неизменен | evidence/NATIVE_OVERWRITE_GUARD.json |
| Браузер | 9 групп PASS, все 16 RU/EN payload на 4 размерах | evidence/BROWSER_RESULT.json |
| Холодный offline | сервер выключен, browser offline=true, 0 HTTP-запросов | тот же BROWSER_RESULT.json |
| Existing contracts | побайтно прежние | evidence/PRESERVATION.json |
| Startup source budget | прежние 79 модулей / 629956 bytes | evidence/PERF.json |
| Подпись платформы | Valid, LLC 1C-Soft | evidence/PLATFORM_ORIGIN.json |
| Исходники кандидата | 44 файла / 336863 bytes | evidence/SOURCE_SHA256.json |
| Safe evidence | SHA256 каждого файла | evidence/EVIDENCE_SHA256.json |

Нативный вывод до и после восстановления:

```text
NEXUS_1C_P1|requests=3|minutes=105|negative=2|PASS
```

Это реальные массив/структуры/цикл и проверки официальной платформы. Прикладные документы/регистры в P1 ещё не сохраняются. Намеренно испорченный модуль в отдельной базе возвращает CheckConfig=101; это ожидаемый отрицательный контроль, а не общий FAIL кандидата.

Браузерные размеры: 1366×900, 390×844, 375×812, 320×700. Проверены контент, overflow, диаграммы, клавиатура, точные модельные итоги, отказ completion без условий, reload, разделение progress, новые копии, экранирование заметок и ошибка storage. Android/iPhone — эмуляция Chromium; Safari/WebKit и физические устройства NOT RUN.

Автономный HTML: 226729 bytes, SHA256 `b0fface4a8fa484fbcb4733e6e68d45840c46d0addcef5538b9cbe04678507c2`. Сам пакет строится воспроизводимой командой, не публикуется как официальный релиз. Native sources и скрипт включены; дистрибутивы платформы отсутствуют.

Локальное первое открытие: desktop 188 ms, Android-size 80 ms, iPhone-size 72 ms, 320px 77 ms. Это одиночные измерения на loopback данной машины, не field p95, не мобильный benchmark и не гарантия production latency. Главное доказательство сохранения NEXUS-PERF-01 здесь — отсутствие изменений startup graph; прежний budget взят из актуального P4-Q main, а не изменён этим кандидатом.

Скриншоты: [ПК](evidence/desktop.png), [мобильный размер](evidence/mobile.png). Они относятся к локальному кандидату. Полный автоматический CI создаёт отдельные артефакты и не публикует production.

Исходники `courses/cpp` на базовом main также совпадают с принятой документационной фиксацией C++ `75e24e195919e7c3d39659ba804e977d51ef5591`. Ничего из выпущенного курса этой веткой не менялось.

История исправлений и ограничения содержательной ревизии: QUALITY_REVIEW_RU.md. Юридические пробелы: LICENSING_RUNTIME_RU.md. Gate статуса всего milestone остаётся PARTIAL до договорённых внешних проверок и интеграционной приёмки.
