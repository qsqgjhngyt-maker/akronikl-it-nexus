# AKRONIKL IT NEXUS — Cloudflare Sync
## Настройка по экранам для v0.1.7-alpha.2.2

Эту инструкцию можно проходить **не самостоятельно целиком, а вместе с ChatGPT по одному экрану**. На каждом шаге можно прислать скриншот Cloudflare — следующий шаг нужно делать только после проверки предыдущего.

> Не публикуйте на скриншотах `BOOTSTRAP_SECRET` и Nexus Token `nxk_...`. Если поле с секретом видно, закройте/замажьте его перед отправкой.

## Что получится

После завершения:

`ПК → GitHub Pages Nexus → Cloudflare Worker → D1 + R2 → смартфон`

Один и тот же Nexus Account сможет увидеть свои облачные проекты. Другой Nexus Token будет иметь другой `subjectId` и не получит доступ к чужим проектам без membership/ACL.

---

## Экран 1. Cloudflare Dashboard

Откройте Cloudflare Dashboard. Ничего пока не создавайте. Пришлите скриншот левого меню/главной страницы — названия пунктов Cloudflare периодически меняются, поэтому дальше безопаснее идти по фактическому интерфейсу.

Цель следующих экранов:

1. создать D1 `akronikl-nexus-sync`;
2. выполнить `setup/INITIAL_SCHEMA.sql`;
3. создать R2 bucket `akronikl-nexus-projects`;
4. создать Worker `akronikl-nexus-sync`;
5. вставить `dist/worker.js`;
6. добавить binding `DB` → созданная D1;
7. добавить binding `SNAPSHOTS` → созданный R2;
8. добавить переменные;
9. добавить секрет `BOOTSTRAP_SECRET`;
10. Deploy.

---

## Переменные Worker

Обычные переменные:

```text
ENVIRONMENT = production
AUTH_MODE = nexus-token
ALLOWED_ORIGIN = https://ВАШ-GITHUB-PAGES-HOST
```

`ALLOWED_ORIGIN` — только origin, без пути и без `/` в конце. Например, если Nexus открыт как:

```text
https://example.github.io/akronikl-it-nexus/
```

то значение:

```text
https://example.github.io
```

Секретная переменная (Secret):

```text
BOOTSTRAP_SECRET = <длинная случайная фраза, известная только владельцу>
```

Рекомендуется не менее 32 случайных символов. Она нужна только для создания первого Nexus Account. После создания первого аккаунта endpoint bootstrap автоматически закрывается.

---

## Проверка Worker

После Deploy откройте:

```text
https://ВАШ-WORKER.workers.dev/api/v1/health
```

До создания первого аккаунта ожидается примерно:

```json
{
  "ok": true,
  "service": "akronikl-nexus-sync",
  "version": "0.1.7-alpha.2.2",
  "authMode": "nexus-token",
  "d1": true,
  "r2": true,
  "bootstrapOpen": true
}
```

Если `d1=false`, `r2=false`, другая версия или ошибка — bootstrap в Nexus пока не выполняем.

---

## Первый Nexus Account на ПК

После установки frontend `v0.1.7-alpha.2.2`:

1. Project Studio → **Cloud Sync**.
2. Введите URL Worker без `/api/v1/...`.
3. Поле Nexus Cloud Token при первом запуске **оставьте пустым**.
4. Введите `BOOTSTRAP_SECRET`.
5. Введите имя аккаунта.
6. Nexus создаст первого владельца и покажет `nxk_...` token **один раз**.
7. Скопируйте token в безопасное место. Не отправляйте его в чат и не включайте в скриншоты.

После bootstrap в Worker/D1 хранится только SHA-256 hash токена.

---

## Первый PUSH

Откройте тестовый проект `Экспедиция — Sync Test`.

В блоке SYNC:

1. нажмите **Включить облако**;
2. Nexus привяжет старый локальный owner к account `subjectId`;
3. выполнит первый PUSH;
4. ожидается:

```text
mode       cloud
provider   cloudflare
cloud rev  1
state      ОБЛАКО
```

Если cloud revision не появился — присылайте скриншот блока SYNC и сообщение ошибки.

---

## Смартфон / второй ПК

На втором устройстве:

1. откройте Nexus;
2. Project Studio → **Cloud Sync**;
3. введите тот же Worker URL;
4. вставьте сохранённый `nxk_...` token;
5. bootstrap secret уже **не нужен**;
6. нажмите **Из облака**;
7. выберите `Экспедиция — Sync Test`.

Проект должен появиться локально вместе с файлами, checkpoints, milestones, ACCESS и sync metadata.

---

## Обратная проверка смартфон → ПК

1. На смартфоне измените одну строку проекта.
2. Нажмите PUSH.
3. Cloud revision увеличится.
4. На ПК нажмите PULL.
5. Изменение должно появиться на ПК.

После этого межустройственный transport можно считать LIVE PASS.

---

## Конфликтный тест выполняем отдельно

Не делайте его во время первого smoke-теста. Позже специально изменим один cloud project одновременно на ПК и смартфоне. Старое устройство должно получить `409 REVISION_CONFLICT`, а Nexus — состояние `CONFLICT`, без тихой потери данных.
