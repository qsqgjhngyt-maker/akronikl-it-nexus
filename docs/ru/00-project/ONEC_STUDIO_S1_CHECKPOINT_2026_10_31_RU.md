# Приёмка первого этапа Studio для 1С

31.10.2026. STATUS: PASS в согласованном владельцем объёме S1 / IMPLEMENTED / AUTOMATED PASS. Полный продукт PARTIAL / NOT PUBLISHED; LIVE S1 с реальной серверной сессией не заявляется.

В единственном PR #63 подключены редактор .bsl/.os, сохранение в прежний account-private store, отдельные копии/provenance, checkpoint как новая работа и JSON source export/import. Существующие Course ID, Topic ID, attempts, работы и прогресс не очищались. Новый template содержит полный оригинальный A2/P2 metadata контекст с проверкой девяти hashes. Native runtime/provider, auth transport, backend и PWA policy не менялись.

75 unit checks, 26 regression groups, 15 прежних и 11 S1 browser groups локально PASS. Главная сохранила 79 модулей / 629956 bytes. Для CI точные 18 paths/modes/hashes утверждённого S1 закреплены в trusted scope; historical publication admission/receipts/allowlist сохранены.

Актуальный отчёт и полный готовый routing: `docs/ru/03-content/onec/STUDIO_S1_RU.md`. Evidence и contract: `docs/ru/03-content/onec/studio-s1/`. SHA/CI текущего HEAD фиксируются в PR metadata. Предыдущие proposal/акты остаются историей до прямого согласования S1.

Main остаётся d8721e06a2b1ac953aa18694c07559c62d388700. Main/production/merge/Release не выполнялись. Остаток: ручной S1 smoke с реальной сессией, physical mobile/WebKit/assistive/p95, независимый review; licensing/training и S2 execution требуют отдельного решения. A3/P3 не начинались параллельно.

ROUTING CHECK: 00/05 → 02/01/07, 04 для ВКР. NEXT RECOMMENDED BRANCH: 02/05. RECOMMENDED MODE: Высокий; runtime/security/licensing — Очень высокий.
