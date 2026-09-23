# LIVE TEST PROTOCOL — v0.1.7-alpha.2.2.1

**Final status: LIVE PASS**  
Дата закрытия протокола: **2026-09-24**

## 1. Production health / bootstrap
- Worker `/api/v1/health`: **PASS**.
- `storage=d1-only`: **PASS**.
- `authMode=nexus-token`: **PASS**.
- `d1=true`: **PASS**.
- После создания первого аккаунта `bootstrapOpen=false`: **PASS**.

## 2. Nexus Account / token
- Первый Nexus Account `Akronikl` создан в D1: **PASS**.
- Токен создан и реально использован (`last_used_at` заполнен): **PASS**.
- Полный `nxk_...` токен в D1 и доказательных скриншотах не хранится/не публикуется: **PASS**.

## 3. Project Cloud PUSH
- Первый PUSH с ПК → Cloud revision 1: **PASS**.
- Повторный PUSH → Cloud revision 2: **PASS**.
- Audit `sync.pushed`: **PASS**.

## 4. Cross-device: PC → iPhone
1. На ПК проект отправлен в облако.
2. На iPhone подключён тот же Nexus Account.
3. Выполнен PULL.
4. iPhone получил Cloud revision 2, checkpoints/этапы/файлы проекта.

Результат: **PASS**.

## 5. Cross-device: iPhone → PC
1. На смартфоне выполнено изменение проекта и PUSH.
2. На ПК выполнен PULL.
3. ПК получил актуальное содержимое и Cloud revision 4.

Результат: **PASS**.

## 6. Optimistic concurrency / stale write protection
Начальная общая база: Cloud revision 4.

1. Смартфон сформировал более новую облачную ревизию.
2. ПК без PULL попытался PUSH из устаревшей base revision.
3. Worker отклонил запись: `Cloud project changed since this client base revision.`
4. Молчаливой перезаписи удалённых изменений не произошло.

Результаты:
- Revision conflict detection: **PASS**.
- Stale write protection: **PASS**.
- Lost update prevention: **PASS**.

## 7. Conflict recovery
1. После конфликта ПК сделал PULL и получил Cloud revision 5.
2. Удалённое изменение со смартфона сохранилось.
3. На ПК добавлено новое изменение.
4. Новый PUSH успешно создал Cloud revision 6.

Результаты:
- Conflict recovery: **PASS**.
- Post-conflict synchronization: **PASS**.
- Audit trail: **PASS**.

## 8. Final result
**AKRONIKL IT NEXUS Cloud Sync — CROSS-DEVICE + CONCURRENCY LIVE PASS.**

Доказательства: [`docs/evidence/releases/v0.1.7-alpha.2.2.1/EVIDENCE_INDEX.md`](docs/evidence/releases/v0.1.7-alpha.2.2.1/EVIDENCE_INDEX.md).
