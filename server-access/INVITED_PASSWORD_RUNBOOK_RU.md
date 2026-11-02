# Email + пароль только для приглашённых — эксплуатация и откат

Статус: source candidate в Draft PR #64. Production, main, облачные секреты и
рабочая D1 не изменены. Исходная main: `d8721e06a2b1ac953aa18694c07559c62d388700`;
продолжена существующая ветка `feature/invited-email-password-2026-11-02`.
Не включать до staging и security review. Merge сам по себе не означает ввод в эксплуатацию.

## Сценарий

1. Владелец/администратор с действующим грантом и свежей Passkey-сессией создаёт
   персональное email-приглашение, выбирает срок ссылки и доступа и отправляет
   ссылку получателю. Старые приглашения без email сохраняют свой Passkey-сценарий.
2. Приглашённый открывает отдельную страницу `/account/password/`, вводит ту же
   почту и запрашивает код. BFF отправляет код только после проверки приглашения
   и хеша заранее привязанного email. Пересылка ссылки сама по себе владение почтой
   не подтверждает: без кода из соответствующего ящика регистрация невозможна.
3. Код действует 15 минут и используется один раз. Новый запрос заменяет прежний.
   Приглашение также должно оставаться действующим, неиспользованным и неотозванным.
4. Участник выбирает уникальный логин Nexus, имя и собственный пароль длиной
   15–128 символов (до 512 UTF-8 байт). После регистрации входит по email + паролю.
   Пароль не устанавливает и не получает администратор. Trial начинается при
   первом подтверждённом входе, а не при создании пароля.
5. «Забыли пароль?» отправляет отдельный код на ту же подтверждённую почту.
   Смена пароля атомарно отзывает ВСЕ сессии и account tokens этого аккаунта,
   инвалидирует начатые password challenges и требует нового входа.
6. Блокировка/удаление из списка доступа и отзыв приглашения используют прежние
   owner ACL и audit. Recovery не разблокирует аккаунт, не продлевает trial и
   не создаёт грантов. Владелец/администратор этим способом входить не может.

## Границы безопасности

- Общий Nexus Account, реестр login_methods и серверные account_sessions.
  Удалённый ресурс продолжает проверять account/device/method/admission/scope/ACL.
  Для административных записей нужен свежий Passkey; пароль его не заменяет.
- KDF на Node BFF: встроенный scrypt `N=32768,r=8,p=3`, соль 16 случайных байт,
  результат 32 байта, максимум четыре KDF одновременно. Выбор совместим с Node 22
  и одной из [конфигураций OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).
  Нагрузочный benchmark выполняется на целевом контейнере до включения.
- Пароль передаётся только POST JSON по HTTPS на доверенный BFF. Worker получает
  соль/верификатор при установке и challenge HMAC при входе. Все RPC подписаны
  отдельным сервисным ключом; время ±30 секунд и сохранённый nonce защищают replay.
- Email-коды: 256 бит случайности, в D1 только SHA-256. Код вводится вручную;
  ни пароли, ни коды recovery не включаются в URL. Invitation token допускается
  только во fragment первоначальной ссылки и сразу удаляется из history.
- Cookie `__Host-nexus_session`, HttpOnly, Secure, SameSite=Strict, Path=/,
  без Domain. Серверный idle TTL 30 минут, absolute TTL 12 часов. Секрет cookie
  не возвращается JavaScript-клиенту и не сохраняется в browser storage.
- Same-origin Host/Origin/Fetch Metadata, JSON + собственный write header,
  лимит тела 4096 байт, запрет дополнительных полей и Authorization.
- Общие лимиты в D1: 200 запросов/операцию/минуту, 30/сетевой bucket/минуту,
  10/email/операцию/10 минут; письма дополнительно 3/email/15 минут. Нет постоянной
  блокировки аккаунта из-за ошибок. Подмена X-Forwarded-For не меняет bucket:
  используется адрес TCP peer. За Gateway это консервативный общий лимит;
  индивидуальные IP требуют отдельного проверенного ingress-контракта.
- Неизвестная почта и неподходящий доступ получают нейтральный ответ.
  Запрос письма не раскрывает deliver/status провайдера, ожидает одинаковое окно
  5,5 секунды с начала операции при общем бюджете RPC + провайдер 5 секунд. Это не гарантия полного
  равенства сетевых таймингов. Ошибку доставки можно повторить с учётом лимита.
- Audit содержит account ID, действие и время; без почты, пароля, кода, verifier,
  proof и session secret. Журналы неизменяемы. Не включать logging request/response
  bodies на Gateway/BFF/Worker и mail API. Метрики доставки — только агрегаты.
- D1 guard + триггеры проверяют состояние ВНУТРИ batch: отзыв, expiry, disable,
  credential version и однократность. Удаление истёкших challenges сохраняет
  строки, на которые ссылаются подтверждённые login receipts.

## Конфигурация staging

Worker: `ALPHA_ADMISSION_ENABLED=true`, `INVITED_PASSWORD_ENABLED=true`,
`INVITED_PASSWORD_SERVICE_KEY` в Worker secrets. BFF:

| Переменная | Назначение |
|---|---|
| INVITED_PASSWORD_PROXY_ENABLED | `true` после готовности staging |
| PRIVATE_GATEWAY_CONFIRMED | `true` только для закрытого IAM container |
| INVITED_PASSWORD_SERVICE_KEY | Тот же отдельный случайный секрет, из Lockbox |
| INVITED_PASSWORD_ORIGIN | Точный HTTPS origin Nexus, без slash/path/query |
| INVITED_PASSWORD_WORKER_ORIGIN | Точный HTTPS origin Worker |
| INVITED_PASSWORD_MAIL_ENABLED | `true` после проверки отправителя |
| INVITED_PASSWORD_MAIL_PROVIDER | mailru или resend (по умолчанию resend) |
| RESEND_API_KEY | Для Resend: sending-only ключ проверенного домена |
| MAILRU_SMTP_USER | Для Mail.ru: служебный адрес отправителя |
| MAILRU_SMTP_PASSWORD | Для Mail.ru: отдельный пароль приложения из secret manager |
| INVITED_PASSWORD_MAIL_FROM | Один подтверждённый адрес отправителя |

Mail.ru: фиксированный smtp.mail.ru:465, implicit TLS >=1.2 с проверкой сертификата, отдельный пароль приложения. Отправитель совпадает с SMTP_USER; SMTP host/port нельзя передать из браузера. Подготовка нового ящика и локальный защищённый ввод: staging/README_RU.md.

Также встроен адаптер Resend: фиксированный `POST https://api.resend.com/emails`,
redirect запрещён; [официальная спецификация](https://github.com/resend/resend-openapi/blob/main/resend.yaml).
Реальная доставляемость, SPF/DKIM/DMARC, egress и доступность провайдера в целевом
окружении требуют staging-проверки. Production-ключи здесь не создавались,
реальная доставка принимается отдельно. Другой провайдер подключается через заменяемый
`sendMail` адаптер с тем же контрактом; не подменять URL переменной из запроса.

Gateway: GET `/account/password/`, `/account/password/password.js` и POST
`/api/v2/account/password/{verify-email,enroll,login,recover,reset,logout}`
на тот же IAM-only BFF. Internal Worker RPC не является публичным браузерным API.
Для logout нужен защищённый `passwordIngressContract=v2` с двусторонней сверкой
Cookie; v3 только по отдельно принятому ingress gate. Общий существующий logout
Nexus также принимает password-сессию через обычную проверку login method.
Проверить передачу Set-Cookie и последующий `/api/v2/account` через реальный Gateway.

## Миграции и включение

1. Зафиксировать точные текущие SHA frontend, BFF image digest/revision, Worker
   version, Gateway spec, flags и ссылки secret versions. Сохранить их как rollback
   manifest. Проверить, что старая версия реально запускается с добавочной схемой.
2. Экспортировать D1, проверить восстановление на ОТДЕЛЬНОЙ базе. Не использовать
   рабочие персональные данные в логах и тестовых отчётах.
3. На isolated/staging D1 применить существующую цепочку 0001–0020 (0017 в проекте
   нет), затем 0021, 0022, 0023 и 0024. Проверить PRAGMA foreign_key_check и контрольные количества
   аккаунтов, login methods, проектов и сессий до/после. 0022 сохраняет прежние
   credentials; неподтверждённые строки из старого draft не получают доступ.
4. Развернуть Worker/BFF с флагами OFF, затем Gateway и новую страницу; сохранить
   Google/Яндекс/Passkey маршруты и существующие секреты. Проверить fail-closed.
5. Включить только staging. Пройти полный сценарий и негативные проверки из тестов,
   реальную почту, обычный logout, revoke, trial expiry, два параллельных запроса,
   Windows без Hello, Android/iOS, PWA, существующие OAuth и Passkey.
6. Проверить CI на точном commit, runtime Node 22 и pinned production image,
   нагрузку KDF и лимиты общего Gateway; провести отдельное security review.
7. После этих проверок представить владельцу конкретные revision/digest и rollback
   manifest. Production deployment/миграции — только после отдельного разрешения.

## Откат

1. Отключить BFF proxy/mail flags и Worker INVITED_PASSWORD_ENABLED; закрыть новые
   маршруты записи. Existing OAuth/Passkey оставить доступными.
2. Отозвать password-сессии, выданные до отключения: выключение флага само по себе
   не отзывает уже выданную общую Nexus session. Операторский SQL для проверки
   на staging, затем отдельного согласования применения к production:

```sql
UPDATE account_sessions SET status='revoked',
 revoked_at=COALESCE(revoked_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 revoked_reason='password-feature-rollback'
WHERE status='active' AND id IN (
 SELECT s.session_id FROM session_login_methods s
 JOIN login_methods l ON l.id=s.login_method_id AND l.kind='password'
);
```

3. Вернуть сохранённые BFF/Worker/Frontend/Gateway revisions, проверить OAuth,
   Passkey, account read и ACL. Старые email-приглашения нельзя принимать как
   Passkey: оставить исправленный admission guard/совместимый Worker, если такие
   приглашения уже были выданы; при полном старом Worker отозвать их перед откатом.
4. НЕ удалять таблицы 0021–0024 и НЕ накатывать старый D1 backup поверх новых
   пользовательских данных. Сохранить credentials/audit для безопасного возврата.
5. Полное физическое удаление password-аккаунта пока требует отдельного schema
   review и политики хранения audit. Block/remove/revoke работают штатно.
   Purge старых аккаунтов без password-строк продолжает работать; новые защищены
   отказом PURGE_SCHEMA_REVIEW_REQUIRED, без частичного удаления данных.

## Проверки

`node --experimental-sqlite server-access/check-invited-password.mjs` — 26 групп,
реальная схема SQLite, подписанные BFF RPC, реальные scrypt, mail stub и гонки.
`node server-access/build-worker.mjs` и `build-bff.mjs` — сборки без deployment.
`node --experimental-sqlite server-access/check-invited-password-workerd.mjs` —
5 групп в реальном локальном workerd/D1, все миграции, параллельный replay, recovery.
`node server-access/check-invited-password-browser.mjs` — desktop/390px browser,
перехваченные synthetic HTTPS ответы, без реальных пользователей и WebAuthn.
В Windows можно задать NEXUS_BROWSER_CHANNEL=msedge; CI устанавливает Chromium.
13 прежних identity/invitation/session регрессионных наборов и 4 worker-network
проверки прошли локально. Runtime dependencies audit: 0; undici 7.30.1.
Локальная среда: Node 24.18, Edge; Node 22 проверяет обновлённый source-only CI.
Live production/реальные почтовые ящики/физические Android и iPhone не проверялись.


## Дополнение security/staging review

Подробная проверка: PASSWORD_SECURITY_REVIEW_RU.md. Миграции 0023 и 0024 дополнительно защищают immutable identity и email invite от старого Passkey path, включая отсутствие managed enrollment. Минимум пароля теперь 15 символов. Mail.ru SMTP и Resend используют отдельные секреты; производственные секреты в staging не копируются.

Созданы отдельные Cloudflare Worker/D1, применены все 23 файла миграций до 0024. Локальный HTTPS BFF работает на Node 22.23.3. Capture-приёмка в настоящей новой облачной D1 пройдена: enrollment, session read, recovery, отказ старого пароля, logout. Настоящая доставка требует отдельного пароля приложения нового sender@example-mail.ru и подтверждения получения на test-recipient@example.com. Hosted Yandex ingress и физические мобильные устройства не объявляются проверенными.

Старые workflow курсов теперь получают точную классификацию SHA diff. Только строгий auth allowlist передаётся identity workflow; courses/runtime/receipts/неизвестные файлы оставляют прежние gates обязательными. Новые проверки classifier и TLS SMTP включены в CI. Frozen release guards и исторические receipts не переписывались.
