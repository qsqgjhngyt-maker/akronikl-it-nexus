# Воспроизведение S8

Это снимки операторских утилит, не пользовательский интерфейс. Они выполнялись из отдельного work-каталога с дочерним repo на точном source HEAD87944bb. Из docs напрямую не запускать: относительные пути намеренно рассчитаны на отдельный work и безопасно откажут при отсутствии source. Public image/ZIP остаются вне Git.

Policy/redaction: node --test ../qa/s8-account-policy.test.mjs ../qa/s8-safe-root.test.mjs (из publication).

Для воспроизведения копировать нужные исходные снимки в отдельный work-каталог. Требуются Git, Node24, существующие Chrome/Playwright (s1-qa/node_modules/playwright), esbuild из отмеченной установки Wrangler, локальный production image с закреплённым ID и его проверенный baseline-public. Не запрашивать cookies/ключи владельца. Браузерный тест использует только искусственный Account и loopback.

Последовательность: copy-public-baseline → build-publication → локальный docker build → check-candidate-image → image-http-smoke → packed-browser-test. Source/CI, generation, transformed module и map привязаны к FROZEN_SOURCE. Точное имя source HEAD — в JSON, сокращение в этой инструкции не заменяет hash.

Сохранённые ранние отказы: дубликат shell в snapshot-helper (shell уже был в manifest), кавычки Git для русских путей (исправлено чтение -z), включение исторического service-desk, исторические PWA authority URLs вне активного image manifest (сохранены без переноса), Host fetch в локальном smoke (заменён штатным http-клиентом), отсутствие искусственного configuration key в тесте (503, затем корректный401). Ошибки упаковки/fixture не объявляются дефектами production и не скрываются ослаблением assertions.

Перед production-forward нужны настоящий Cloud pin/config, неизменность Worker/Gateway/settings, применимый существующий auth gate и свежие receipts. Текущие локальные HTTP smoke и voice owner confirmation не заменяют три полных входа. Новые платные ресурсы, main, merge и официальный Release здесь не выполнялись.
