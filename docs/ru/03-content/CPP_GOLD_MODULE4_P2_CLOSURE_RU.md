# C++ Module 4: закрытие P2

26.10.2026. STATUS: PASS — M4-05-P2-01 CLOSED, AUTOMATED PASS. Исправленный продукт `9d62de9b7a95da78733e354bdf2fe77a6ba1d724`, только feature/academy-gold-standard-cpp-module-4. Прежний акт приёмки a3e3488 сохраняется как история; новая подтверждённая фиксация закрывает его единственный P2.

## Исправление

В `courses/cpp/gold/classic/associative-containers.en.json:90` заменено default-initialized mapped value на value-initialized mapped value. Для нулевого int добавлено уточнение standard allocator. Это согласует теорию с уже правильным пояснением workedExamples[0].steps и с семантикой вставки через operator[]. Основания: [N4861 map access](https://timsong-cpp.github.io/cppwp/n4861/map.access), [unordered_map access](https://timsong-cpp.github.io/cppwp/n4861/unord.map.elem).

Единственное продуктовое изменение — точная замена фразы в одном EN абзаце, +26 байт. До: `d791ed91a7d2667469b2e2122596b51a1f60904f35ccff73b60c76d0c0e62cab`; после: `f0898fab5f73752022f64766fb20bd31832c01ce6ff3d856dea77178dd592337`. В authoring scope обновлён только этот SHA256. Остальные материалы, ID, quiz, curriculum, runtime, Identity, Cloud, storage и опубликованные поколения побайтно сохранены.

## Повторные проверки

| Проверка | Доказанный результат |
|---|---|
| Content Quality Gate, зависимости и preservation M4/M1–3 | PASS; 34 группы регрессии и 13 интеграционных проверок |
| Нативный C++ | Новый g++13.3 C++20/noEH/UBSan запуск: 35 пакетов, 190/190 случаев PASS; preflight 42 отдельно, без суммирования |
| WASM | 190 прежних реальных результатов CI40224917193 повторно сверены с текущими source/bundle/case hashes, stdout/exit code и файловыми свойствами; новый WASM запуск не выполнялся |
| EN формулировка | Отдельная браузерная проверка исправленного текста online/cold Offline; личный код и legacy quiz сохранены |
| 05/07 | 184 перехода, 16 RU/EN объектов, 96 сочетаний шести ширин, 128 вопросов/256 feedback submissions, glossary keyboard/focus/AX, startup и синтетические проекты/checkpoints PASS |
| QA-сборка | 2504 manifest records / 2505 файлов, каждый hash проверен, 240 текущих payloads совпали с исходниками |
| NEXUS-PERF-01 | 75 модулей / 590301 B при cap75/600000; Home2 JSON /27551 B при cap30000 |

[CI native/invariants/editorial 40248534462](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40248534462) — SUCCESS: три выполненных job PASS, runtime job SKIPPED на основании точного proof. [CI приёмки 40248534471](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40248534471) — SUCCESS на том же candidate SHA. CI artifacts скачаны и сверены по digest; source proof, 190 native результатов и browser assertions проверены по первичным JSON. Восемь default-примеров и capstone UI из исходной приёмки остаются доказательствами для неизменённых исполняемых контрактов; их повторный WASM запуск не заявляется.

## Граница повторного использования evidence

Проверка разрешает только точные байты известной P2 замены, соответствующий SHA в scope и прежний manifest всех 35 пакетов/190 случаев: `85597d8e49fd3fc8d18a46d9fcaf999246efa405706a53c136b66aca59723fe7`. Остальной продукт и extractor/file-properties helpers сравниваются с a3e3488. Отрицательные контроли отклоняют изменённые C++ source, stdin, stdout, locale, другую прозу и переформатирование. Любое несовпадение возвращает полный runtime gate; ошибка самого proof не может дать ложный PASS приёмки.

Таким образом обновлённый текст имеет новый product SHA; побайтовое равенство всего продукта старому a3e3488 не утверждается. Равны исполняемые контракты и остальные продуктовые файлы. Никакие perf caps не повышены. Field timing, LCP и ускорение в процентах не измерялись; background SW precache исключён из Home guard.

## Статус и координация

Открытых P0/P1/P2 в выполненной области нет. Main остаётся 03c8a7ba1306c59f35b83ea5650ae73b71988272; production, официальный Release/tag не менялись. Использованы изолированные synthetic accounts; реальные cookies, аккаунт и работы владельца не читались. Physical Android/iPhone/Safari, полный WCAG и FULL LIVE PASS M4 не выполнялись. Для тестовой публикации требуется отдельное разрешение владельца.

Есть ли здесь материал для диплома? Да: условное повторное использование дорогого исполнения при точной проверке входных контрактов, отрицательные контроли и разделение исторического и текущего source SHA. Альтернатива широкого пропуска всех EN изменений отклонена; доказательство ограничено одним известным исправлением. Измеримые факты — +26 B, 35 неизменённых пакетов, 190 свежих native случаев и 190 повторно сверенных WASM случаев. Повышение учебной эффективности не измерялось.

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03. Куда: 00 → 05/07; материал 04 и сведения 02/01. Когда: сейчас, перед решением о публикации. Полный готовый текст — CPP_MODULE4_P2_ROUTING_RU.txt. MASTER обновлён в feature; synced sources не менялись. Сообщения в другие чаты не отправлялись.

WHAT WAS PROVED: P2 закрыт; обновлённый candidate прошёл необходимые проверки и повторную приёмку 05/07.

WHAT REMAINS: решение владельца о тестовой публикации и последующая physical/LIVE проверка.

ROUTING CHECK: 00,05/07; 04 — метод evidence, 02/01 — контракты сохранены.

NEXT RECOMMENDED BRANCH: 00, решение о тестовой публикации M4.

RECOMMENDED MODE: Высокий; для будущей публикации — Очень высокий.
