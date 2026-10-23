# Alpha10.3.1 — завершение контролируемого отката

24 октября 2026 года, Красноярск (UTC+7).

STATUS: **PASS — controlled rollback и проверка опубликованных файлов**. FULL LIVE PASS / приёмка реальных профилей и физических устройств не присваиваются.

WHAT WAS PROVED:

- [PR №23](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/pull/23) объединён; активный [main `0a134bbb496efae19df373bddff9a00dae9ff3dc`](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/commit/0a134bbb496efae19df373bddff9a00dae9ff3dc), дерево `c9d02c5a61034eaf3f42e254640ec4d7efeb1dc0`. Родители: прежний main `cf4ae9ded9b17db4911c78196bf6bc56df7d8a67` и коммит отката `8421c70c443895a9a89df5de392a956b2a7586a5`.
- [Штатный Pages deployment №39992837044](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/39992837044): build/deploy SUCCESS для точного нового main. Deployment завершён 2026-10-23 17:10:29 UTC = 24 октября 00:10:29 Красноярск.
- Опубликованы `0.1.7-alpha.2.4.6-ui1a.10.3.1`, `ui1a-alpha10-public-install-20261023`. Источник — официальный commit `0f71bb9f8752a34040ccb007acb2efcb89d8e36a` и [официальный пакет](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/releases/tag/v0.1.7-alpha.2.4.6-ui1a.10.3.1), без реконструкции и пересборки.
- [GitHub Pages](https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/): 1258/1258 SHA256/размер совпали — 1112 файлов 10.3.1 и 146 сохранённых ресурсов поколения 10.4.2.
- [Yandex origin](https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net/): 1258/1258 проверок. 1256 SHA256/размер совпали; ещё два результата — неизменённая landing BFF и ожидаемый 401 закрытой оболочки. Это не утверждение о побайтовой идентичности анонимной landing и GitHub index.
- Полный LIVE readback: 2516/2516, завершён 24 октября в 00:14:12 Красноярск. MIME и Cache-Control: 2508/2508 публичных ответов. Анонимные private guards: 4/4; no-store, Vary: *, без Set-Cookie. GET без credentials; записей в данные нет.
- Реальный HTTPS Chrome: обе публичные landing и version.json PASS в Desktop/mobile viewport, ошибок JavaScript и горизонтального переполнения нет. Это анонимный rendering smoke с блокировкой SW в данном прогоне, а не реальная авторизация или физическая установка.
- Нативная механика service worker отдельно: 10.4.2 → 10.3.1 → 10.4.2 → 10.3.1, пять групп PASS, две fixture-вкладки и точные зашифрованные проекты/прогресс сохранены; офлайн-расшифровка после каждого перехода PASS. Семь групп навигации точной 10.3.1 PASS.
- [Защитная ветка Alpha10.4.2](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/tree/safety/alpha10-4-2-before-rollback-20261024) указывает на `cf4ae9ded9b17db4911c78196bf6bc56df7d8a67`. Все 2455 `releases/`/`entry-assets/` сохранены побайтово; история main не переписана. BFF, Cloudflare/D1, Identity, grants, секреты, БД и инфраструктура не изменялись.

WHAT REMAINS: владелец сохраняет работу, выбирает «Проверить обновление», затем «Сохранить работу и обновить» и проверяет версию 10.3.1, проекты и отзывчивость меню на своих устройствах. Не очищать данные сайта и не переустанавливать PWA. Скорость backend и вход реальным аккаунтом требуют отдельной приёмки.

Точные SHA256 пакета, manifest и worker: предпубликационный журнал `CONTROLLED_ROLLBACK_ALPHA10_3_1_2026-10-24_RU.md`. Сводные LIVE доказательства: `docs/evidence/controlled-rollback-2026-10-24/LIVE_AFTER_SUMMARY.json`; полный raw readback и screenshots сохранены в локальном evidence-пакете, SHA256 raw указан в сводке.

## 🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 07 · UI / UX / MOBILE / PWA.
Результат/milestone: controlled rollback Alpha10.4.2 → Alpha10.3.1 — PASS в указанном объёме.
Куда: 05 → 00 → 04, в порядке приоритета.
Почему: закрытие публикации, фиксация активного frontend и доказательная база ВКР.
Когда: сейчас, после LIVE gate.
Что передать: точный main, источник 10.3.1, защитную ветку 10.4.2, deployment, live counts, native PWA test и ограничения.

Готовый текст для вставки в 05:
«24.10.2026: controlled rollback Alpha10.4.2 → точная Alpha10.3.1 опубликован через PR #23, main 0a134bbb496efae19df373bddff9a00dae9ff3dc, Pages run 39992837044 SUCCESS. Официальный пакет и 1112 файлов сверены. LIVE: Pages 1258/1258, Yandex 1258/1258 (1256 exact + неизменённая landing BFF + 401 shell), MIME/Cache-Control 2508/2508, guards 4/4. Нативный PWA переход — 5 групп PASS, навигация — 7. 10.4.2/история/2455 immutable файлов сохранены; backend/БД/grants не менялись. Принять release evidence в указанном объёме; FULL LIVE PASS без владельца не присваивать».

Готовый текст для вставки в 00:
«Зафиксировать активный frontend/PWA 0.1.7-alpha.2.4.6-ui1a.10.3.1, generation ui1a-alpha10-public-install-20261023, main 0a134bbb496efae19df373bddff9a00dae9ff3dc. Controlled rollback PASS, deployment 39992837044 SUCCESS, оба origin проверены. 10.4.2 остаётся в safety/alpha10-4-2-before-rollback-20261024. Следующий приоритет — приёмка меню/проектов владельцем в 07; оптимизацию выпускать отдельным кандидатом после полноценной навигационной regression. Добавить milestone в MASTER, не затрагивая read-only sources».

Готовый текст для вставки в 04:
«Есть материал для диплома: контролируемое возвращение точной immutable публикации с неизменной identity PWA и форматом зашифрованной локальной копии. Альтернативы: пересборка старого поколения и reset main отклонены ради точности ресурсов и сохранения истории. До: 10.4.2; после: точная 10.3.1 с сохранёнными ресурсами 10.4.2. Измеримый результат: 1112 файлов официального пакета, 2516 LIVE ответов, 2508 MIME/cache checks, 4 guards, 5 PWA и 7 navigation групп PASS. Ограничения: синтетические данные, анонимный LIVE, без реальной mobile/Account приёмки. Сохранить неудачные тестовые ожидания и блокировку loopback как ограничения методики. Backend/Identity/БД не менялись».

Что потом: 05 фиксирует evidence, 00 обновляет актуальный статус, 04 пополняет evidence ledger; вернуться в 07 для приёмки владельца.

ROUTING CHECK: 05 / 00 / 04 — готовые тексты выше; контракты других веток не изменены.
NEXT RECOMMENDED BRANCH: 07 · UI / UX / MOBILE / PWA.
RECOMMENDED MODE: Средний для короткой приёмки; Высокий для последующего исправления производительности.
