# Два полных курса 1С — интеграционный кандидат

Актуальная фиксация 31.10.2026: [полный отчёт](full-course-20261031/REPORT_RU.md). **IMPLEMENTED84 темы/168 RU/EN; общая готовность к публикации PARTIAL.** Единственный кандидат — Draft PR #63; main/production/merge/Release не меняются.

P: onec, 12 модулей/52 темы, «Программирование на 1С: Предприятие 8 — от основ до профессиональной разработки». A: 1c-enterprise, 8 модулей/32 темы, «Основы использования и конфигурирования 1С: Предприятие». Итог каждого: 3 варианта×24 вопроса, 4 практики, 3 проекта на выбор. Runtime/авторство/сертификация не подтверждаются локальной самопроверкой.

Открытие: курсы через courses/onec-education/index.html на статическом HTTP сервере; ссылки candidateRoute в manifest. Полный Studio шаблон открывается из лабораторной или общего Project Studio, сохраняет отдельные работы и provenance; Run не выполняет BSL. Нативные инструкции: native/README_RU.md, native/README_A2P2_RU.md, native/README_FULL_RU.md в каталоге courses/onec-education/. Текущая reference проверка — официальная 8.3.27.2214, не training8.3.27.1508.

Воспроизводимые проверки из корня repo:

~~~text
node tools/check-onec-regression.mjs
node tests/onec-browser.mjs
node tools/build-onec-offline.mjs <НОВЫЙ_КАТАЛОГ>
~~~

Для browser нужны Playwright1.62.1 (NEXUS_PLAYWRIGHT_MODULE) и при необходимости NEXUS_CHROME_PATH. ONEC_EVIDENCE/ONEC_REGRESSION_EVIDENCE направляйте вне checkout. Новый каталог native/offline обязателен: прежняя работа не перезаписывается. Платформа 1С и платные services не включаются в архив. Переносимый HTML, его локальный progress и аккаунтное хранилище Studio имеют разные origins/границы; Cloud backup не добавлен, сохраните экспорт.

История:[консолидация 95→84](CONSOLIDATION_RU.md), [A2/P2](A2P2_RU.md), [review03/05 и P4-Q](P4Q_GATE_REVIEW_RU.md), [S1review](STUDIO_S1_REVIEW_RU.md). Эти акты сохраняют прежний объём, актуальное закрытие R06 и новые риски находятся в полном отчёте. Воспроизводимые доказательства и хеши — full-course-20261031/. Каталог остаётся PLANNED до приёмки S2 и полного releasegate. Оставшиеся внешние условия:[runtime readiness](full-course-20261031/RUNTIME_READINESS_RU.md).
