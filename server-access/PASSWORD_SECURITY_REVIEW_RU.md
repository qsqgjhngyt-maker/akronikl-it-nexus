# Проверка безопасности PR #64 — 2 ноября 2026

Область: invitation/email proof → password credential → challenge login → Nexus
session → recovery → owner revoke; BFF/Worker/D1, transport, SMTP, CI и staging.
Выполнены повторное чтение реализации и негативные интеграционные проверки.
Это внутренняя инженерная проверка; независимый внешний аудит не заявляется.

## Найдено и исправлено

| Приоритет | Наблюдение | Исправление / подтверждение |
|---|---|---|
| P2 | Окно нейтрального ответа начиналось после условного DB lookup/write, оставляя разницу по времени | Общий бюджет 15 секунд охватывает RPC и почту (провайдеру не более 10 секунд), ответ через 15,5 секунды; неизвестный адрес, ошибки Worker и провайдера не раскрываются |
| P2 | Старый или откатанный Passkey application path мог не знать email-specific запрета | Миграции 0023/0024 запрещают password invite → Passkey receipt на уровне D1; старые приглашения без email сохраняют свой путь |
| P2 | Подтверждённая identity не имела отдельного immutable guard | 0023 запрещает изменение account/method/email/verification/algorithm/created_at и version без reset |
| P2 | Пароль был единственным фактором при минимуме 12 | Минимум 15 Unicode-символов; длина до 128/512 байт, без усечения, реальный scrypt и распределённые лимиты |
| P2 | Нативный fetch закреплённого Node может отличаться от исправленной HTTP-библиотеки | Новые password/mail запросы используют закреплённый undici 7.30.1 напрямую |
| P3 | Парольная страница разрешала WebAuthn в Permissions Policy | Явный запрет publickey-credentials-create/get на этой странице; HSTS; ранее выданные Passkey/OAuth маршруты сохраняют прежнюю policy |
| P3 | Derived buffers дожидались GC | Обнуление временных KDF buffers после использования |

## Что проверено

- 26 групп с полной реальной схемой SQLite, настоящим KDF и подписанными RPC:
  binding email/invite, неверный/истёкший/отозванный invite, mail proof, reuse,
  credential version, восстановление и отзыв сессий, ACL и блокировка владельцем.
- Ранние отказы для extra fields, oversized body, короткого/слишком длинного
  пароля, неправильных Origin/Fetch Metadata и выключенных флагов.
- Гонки регистрации/входа/reset с owner block/remove, challenge replay и
  подмена network binding. Атомарные guards выполняются внутри batch.
- Реальный локальный workerd/D1: вся цепочка до 0024, FK integrity и параллельный
  login challenge, из которого ровно один запрос получает сессию.
- SMTP-адаптер Mail.ru: фиксированный smtp.mail.ru:465, implicit TLS >=1.2,
  обязательная проверка сертификата, разрыв сокета по AbortSignal, отсутствие
  доступа к файлам/URL и logger/debug. Реальный локальный TLS SMTP сервер
  подтверждает содержимое письма и отмену зависшей доставки. Настоящие пароли
  почты и письма пользователей в этих тестах не использовались.
- Старые действующие приглашения без email принимаются прежним managedInvitation
  и не превращаются в password invitation. Не выполнялась массовая перевыдача.
- CI routing проверяет точный diff по SHA и строгому allowlist. Courses/runtime,
  frozen receipts, неизвестный core и любые неизвестные пути сохраняют прежние
  gates. Имя feature-ветки само по себе ничего не разрешает. Исторические
  p4q-release-scope и receipts не изменялись.

## Staging и эксплуатационные границы

Созданы НОВЫЕ Worker и D1 с именем `nexus-password-staging-769214238790`.
Рабочая D1 не читалась и не мигрировалась, production Worker/YC/main не менялись.
Новая D1: `a8c2e02f-618c-418a-8b7c-34f4f6981d27`; применены 23 файла миграций,
включая 0021–0024. Схема заполнена только синтетической fixture и тестовым
приглашением. Её нельзя продвигать в production как пользовательскую базу.

BFF staging работает на локальном HTTPS `https://localhost:8443` с проверенным
Node 22.23.3. Worker принимает только три подписанных внутренних маршрута;
публичный обход закрыт. Cloudflare secrets созданы отдельно. Изолированный
staging end-to-end подтвердил enrollment, session read, recovery, отказ старого
пароля и logout в настоящей облачной D1. Почтовый capture хранит коды только
в локальном закрытом файле, который не публикуется и не раздаётся по HTTP.

Точный закреплённый Linux Node 22.23.3 image также проверен локально без сети:
4 KDF одновременно, 1 CPU / 384 MiB, 793 мс на одну такую группу, max RSS
182700 KiB. Это один синтетический замер, а не обещание production throughput.
Сетевой доступ Docker staging в этой среде не работал; HTTPS BFF запущен на
Windows Node 22.23.3 с проверенным SHA-256 официального executable.

## Остающиеся условия перед production

1. Реальная SMTP доставка: новый отправитель `<служебный-адрес>`, отдельный
   пароль приложения, тестовый получатель `<тестовый-получатель>`. Ключ вводится в
   локальном маскированном окне; не в чате, argv, URL, git или CI. Успешный SMTP
   queue acceptance и реальное получение в ящике — разные проверки.
   Ключ уже настроен локально; TLS/AUTH прошли, но DATA отклонялся SMTP 550.
   Доставка и причина ограничения отправителя ещё не подтверждены. Сохраняются
   только фиксированные технические категории, без provider response text.
2. HTTPS/IAM/Set-Cookie на целевом Yandex Gateway: локальный staging ingress
   не выдаётся за проверку production IAM. Текущий локальный YC credential
   возвращал 401; он не менялся. Нужен действующий операторский вход для будущего
   отдельного hosted staging, без копирования production secrets.
3. Проверки на физических Android/iPhone и PWA, условия почтового провайдера,
   нагрузка за общим Gateway/IP bucket, точные deployment/rollback revisions.
4. Политика удаления password identities и audit retention пока требует отдельного
   review; block/remove/revoke работают. Утечки паролей по большой внешней базе
   не проверяются, полного NIST-соответствия эта проверка не заявляет.

Источники решений: [NIST, Passwords](https://pages.nist.gov/800-63-4/sp800-63b.html),
[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[Mail.ru SMTP и пароль приложения](https://help.mail.ru/mail/login/mailer/),
[Nodemailer SMTP](https://nodemailer.com/smtp).
