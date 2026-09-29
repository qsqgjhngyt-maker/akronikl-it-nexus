# LIVE-протокол — v0.1.7-alpha.2.4.4

## Предусловия
- production Worker остаётся `0.1.7-alpha.2.4.2-identity-foundation`;
- D1 migration остаётся `0004`;
- `IDENTITY_V2_BRIDGE_ENABLED=false` — нормальное production-состояние;
- raw `nxk_...` / `nxs_...` не показывать на скриншотах.

## A. Deploy
1. Опубликовать frontend `v0.1.7-alpha.2.4.4`.
2. Hard refresh.
3. Проверить badge `v0.1.7 α2.4.4`.
4. Account → Nexus Cloud:
   - Cloud account подключён;
   - `Legacy rollback` доступен.
5. Открыть существующий cloud project.
6. В SYNC до создания server session ожидается:
   - `auth transport: legacy fallback`.

## B. Controlled server-session
1. Временно включить `IDENTITY_V2_BRIDGE_ENABLED=true`.
2. Через безопасный DevTools-script создать test `nxs_...` для текущего аккаунта.
3. Не выводить token в console.
4. Вернуть bridge в `false`.
5. Перейти в Project Studio.

Ожидается:
`auth transport: server session`.

## C. PULL через server session
1. На controlled test project выполнить PULL.
2. Ожидается успех.
3. Account → Devices должен показать активную текущую session.
4. Legacy token не должен использоваться как первый bearer.

## D. PUSH через server session
Только на тестовом проекте:
1. сделать безопасное небольшое изменение;
2. PUSH;
3. подтвердить рост cloud revision;
4. audit должен показать `sync.pushed`.

## E. Проверка stale-session fallback
1. Отозвать test session сервером, но оставить stale `nxs_...` в `sessionStorage` до следующего Cloud Sync запроса.
2. Выполнить PULL.
3. Ожидается:
   - первый запрос с session получает `401 INVALID_SESSION`;
   - stale `nxs` удаляется;
   - выполняется ровно один retry через legacy;
   - PULL успешен;
   - Project Studio после повторного открытия показывает `auth transport: legacy fallback`.

## F. Security negative checks
- `403` не должен вызывать legacy retry.
- `409 REVISION_CONFLICT` не должен вызывать legacy retry.
- bridge после теста обязательно `false`.

## G. Mobile regression
На iPhone и Android:
- Nexus Cloud connection не потеряна;
- список cloud projects открывается;
- существующий legacy path работает, если server session отсутствует.

## PASS gate
Релиз получает FULL LIVE PASS только после A–G.
