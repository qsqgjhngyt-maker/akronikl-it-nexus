# ADR · SESSION-REMEMBER-P1A — защищённый транспорт доверенного устройства

Дата: 23.10.2026. Рабочая ветка: 07 UI/UX/PWA, изолированный Security-кандидат. Режим: Очень высокий.

**STATUS: IMPLEMENTED IN ISOLATION / AUTOMATED PASS; PRODUCTION FLAG OFF, NOT WIRED.**
Не является 30-дневной работающей авторизацией. Никаких изменений production, реальных сессий, D1 или GitHub `main` нет.

## Цель

Убрать повторный ввод пароля/Passkey после обычного возвращения к Nexus и перезапуска браузера, **но только когда пользователь сам включил доверие этому устройству**. Не подменять этим свежую авторизацию для чувствительных действий. По умолчанию длительный вход выключен. Абсолютный срок гранта — максимум 30 суток без продления за счёт ротации.

## Реализация P1A

- `worker/remember-device-core.mjs`: 32 байта CSPRNG, только SHA-256 в D1, CAS-ротация, пятсекундное окно гонки двух вкладок, обнаружение replay, отзыв, выдача сессии с `auth_strength=remembered-device-v1`.
- `worker/remember-device-d1.mjs`: пять связанных D1 statements (spent/CAS/new session/method binding/receipt) в одном `batch()`, ролевая/доступная проверка; отдельный отзыв гранта и производных сессий. Используется только в изолированных тестах.
- `docs/ru/identity/proposals/SESSION_REMEMBER_0017_D1_DRAFT.sql.txt`: предложенная аддитивная схема; **НЕ ПОМЕЩАТЬ в `server-access/migrations/` без отдельного gate**.
- `worker/remember-device-proof.mjs`: свежесть `account-method-v1` не старше пяти минут, серверный SHA-256 сессионного cookie, статусы субъекта, устройства, метода и Alpha. `LIMIT 2`: неоднозначность привязки метода запрещает выдачу.
- `remember-device-transport-contract.mjs`: строго три действия `enroll`, `renew`, `revoke`, формат двух cookie и закрытого RPC.
- `bff/remember-device-transport.mjs`: точный same-origin POST, Origin и Fetch Metadata, обязательный custom-header, проверенный Gateway `rememberIngressContract=v3`, запрет дублей cookie, HMAC-SHA256, случайный одноразовый nonce. В browser response — только `204` и `Set-Cookie` (`__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`), либо безопасный код ошибки; **нет JSON с сырой credential**.
- `worker/remember-device-internal.mjs`: повторная HMAC-проверка, ±30 секунд, `account_service_nonces`, транзакционное ядро, без логирования credentials.
- **Route integration не выполнена**: `bff/routes.mjs`, `worker/entry.mjs`, live Cloud Sync, Passkey/OAuth и PWA не импортируют P1A.

Случайные значения в тестах синтетические и создаются в памяти. Ни raw session cookie, ни OAuth/Passkey secret не добавлены в файлы или логи.

## Состояния и безопасность

- `ENROLL`: только явное согласие и **свежая** сильная сессия на подтверждённом аккаунте/устройстве. Нет возможности выбрать другого пользователя из браузерного тела.
- `RENEW`: только действующий remember-cookie → атомарная замена и новая сессия **пониженных полномочий**. Поле срока гранта неизменно; replay не даёт вторую сессию.
- `REVOKE`: отзыв cookie/grant/производных сессий, если предъявлен текущий cookie. Это адресное отключение доверия, **не полный единый logout**.
- `CSRF`: same-origin, `Origin`, `Sec-Fetch-Site`, кастомный заголовок; `SameSite=Strict`. Сам по себе маркер Gateway не заменяет IAM.
- `PRIVATE`: никакого CacheStorage, localStorage, IndexedDB, JS-visible bearer или секретов в body ответа браузеру.
- `FAIL CLOSED`: отсутствие feature flag, Gateway context, Worker HMAC, D1 nonce или SQL proof блокирует операции.

## Автоматические доказательства

- Node P1A: **40/40 PASS**, включая синтетический BFF→Worker→SQLite, подпись/подмену/replay/nonce, P1 domain core, D1 contract, строгое отключение production routes.
- SQL (SQLite): **15/15 исходных trigger guards + 10/10 новых proof guards PASS**. **Не реальный Cloudflare D1**.
- Syntax: **6/6 PASS**.
- Совместимые существующие сценарии: `auth-bootstrap` 22 PASS, account-storage isolation 21 PASS, first-party cookie client, session-only resume, Cloud Sync client transport, OAuth BFF и cookie-ingress CHECK PASS.
- Отдельные блокеры расширенной регрессии: `check-cloud-session.mjs` возвращает 503 вместо 200 на исходном неподменённом проекте; воспроизведено вне P1A. `check-passkey-cancelled-enrollment.mjs` не стартует без `@simplewebauthn/server` в данном runtime. Оба сценария не засчитаны как PASS.
- REAL HTTPS/Yandex IAM, real Cloudflare D1, physical Android/iPhone, live Account/Cloud Sync/PWA — **NOT VERIFIED**.

## Открытые блокирующие условия P1B/P1C

1. **LOGOUT**: явный `logout`, выход на всех устройствах, смена пароля/Passkey и Account revoke должны **атомарно** отозвать remember-грант и все созданные им сессии. Текущий Passkey logout не знает о remember-грантах. Нельзя подключать silent renewal до этого.
2. **AUTHZ**: существующий `readEligibleAccountFoundation` признаёт только `account-method-v1`; Cloud Sync аналогично. Некоторые серверные SQL-пути проверяют статус сессии без `auth_strength`. Не включать `remembered-device-v1` повсеместно: требуется матрица разрешённых чтений и обязательный fresh step-up для write/admin/method changes.
3. **COOKIE INGRESS**: реальная инфраструктура должна подписанно/через приватный IAM подтверждать `rememberIngressContract=v3`; обновление protected cookie allowlist после регрессионных проб. Проверить реальный `Set-Cookie` и path/scope, отсутствие ретрансляции секретов.
4. **ROUTING**: проверить включённый в staging BFF/Worker роутер, лимиты, rate-limit, аудит без raw secrets, успешный `/api/v2/account` после восстановленной сессии и безопасный client bootstrap.
5. **CONCURRENCY**: две вкладки, lost response, граничные случаи ротации и отзыва, 30-й день, clock drift, graceful invalidation, logout race. Пока пять секунд дают `409`, после чего повторное предъявление старого ключа отзывает grant.
6. **RELEASE**: независимый Security Gate 01 + Release Gate 05, HTTPS/мобильные испытания с синтетическими аккаунтами, миграция/rollback, сохранность проектов/прогресса, явное разрешение владельца. Нельзя выпускать по одному лишь локальному PASS.

## Альтернативы, отвергнутые

- `Max-Age=30 дней` для обычной сессии без серверного grant — увеличивает окно риска и не продлевает серверный idle.
- Сохранение refresh-token в JS-хранилище — увеличивает последствия XSS.
- Тихая сессия с `account-method-v1` — потенциальный обход требования свежей Passkey для администрирования.
- Автоматическое включение нового RPC при сборке — нарушает release/security gates.

## Материал для диплома

Архитектура до: одно first-party HttpOnly короткое session cookie. Предложение после: короткая сессия плюс отдельно отзывной фиксированно-живущий remember grant, HMAC RPC, атомарная ротация, отдельный auth-strength и явный step-up. Доказательства: исходники, тесты, SQL guard, runtime isolation, replay rejection, negative cases, результаты FAIL/исправлений тестового адаптера. Нет доказательства production-эффекта до LIVE.

Справка: OWASP Session Management Cheat Sheet; RFC 10017 (2026) о браузерных OAuth-клиентах и ограниченной ротации refresh-токенов; Cloudflare D1 `batch()` semantics. Ни один внешний документ не заменяет нашу фактическую security-проверку.
