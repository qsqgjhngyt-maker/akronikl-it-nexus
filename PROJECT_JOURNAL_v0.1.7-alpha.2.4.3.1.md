# PROJECT JOURNAL — v0.1.7-alpha.2.4.3.1

Дата: 2026-09-27

Во время Android smoke `2.4.3` тестирование запуталось не из-за backend, а из-за названия и размещения кнопки `Cloud Sync` в общем блоке Projects.

Факты LIVE-теста:
- Android сначала был `local-only`;
- после ручного подключения стал `cloud-linked`;
- Account Center и Identity v2 live data работали;
- `↓ Из облака` увидел проект cloud rev 7;
- PULL завершился успешно;
- audit записал `sync.pulled`.

Следовательно, обнаруженная проблема переклассифицирована из предполагаемого routing defect в **UX / Information Architecture debt**.

Принято решение:
1. device/account Cloud config живёт в Account Center;
2. dashboard Projects не содержит account setup;
3. `↓ Из облака` отвечает только за import;
4. проектный SYNC отвечает за PUSH/PULL;
5. все настройки из project SYNC ведут в Account Center.

Это решение сокращает когнитивную неоднозначность и готовит UI к будущему Identity v2, где Cloud connection станет частью Account/Device lifecycle, а не функцией списка проектов.
