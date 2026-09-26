# Account UI / Auth State Contract

## Global header

Target signed-in state:

```text
[Avatar] Akronikl
● Синхронизировано
```

Click/tap opens:

```text
Профиль
Моё обучение
Мои проекты
Карта навыков
Устройства и сессии
Безопасность
Уведомления
Выйти
```

## Signed-out
Show a clear `Войти` action without blocking local-first learning unnecessarily.

## Account states
- local-only
- signing-in
- signed-in
- offline-authenticated-cache
- session-expired
- security-step-up-required
- disabled

## UX rules
- nickname is visible in normal header;
- session token is never visible;
- provider details live in profile/security settings;
- sync status is distinct from auth status;
- login on a new device should restore cloud profile/progress/projects after authorized synchronization;
- logout does not silently delete local-only user work without explicit policy/action.
