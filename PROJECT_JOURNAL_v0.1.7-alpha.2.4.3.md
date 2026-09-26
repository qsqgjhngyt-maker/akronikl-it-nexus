# PROJECT JOURNAL — v0.1.7-alpha.2.4.3

Дата: 2026-09-27

После FULL LIVE PASS серверного Identity Session Foundation (`2.4.2`) начат следующий слой — пользовательское управление Devices & Sessions.

## Engineering decision
Мы не стали автоматически создавать `nxs_...` при загрузке Account Center и не включаем migration bridge из frontend.

Вместо этого введён credential resolver:
- если безопасная server session уже существует в `sessionStorage`, Account Center предпочитает её;
- если она истекла/отозвана, временный credential очищается;
- во время миграции Account Center может использовать legacy credential как rollback;
- сам Project Studio Cloud Sync остаётся неизменным.

Это позволяет постепенно мигрировать Identity без одномоментного риска для рабочего Cloud Sync.

## Runtime UX
Account Center теперь способен реально показывать:
- server devices;
- sessions/history;
- current device;
- current server session;
- status/activity/expiry;
- revoke actions.

## Next
После LIVE проверки этого increment следующим архитектурным шагом будет first-party session transport, после которого legacy browser-readable token можно будет начать выводить из нормального login path.
