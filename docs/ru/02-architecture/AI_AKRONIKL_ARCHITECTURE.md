> **Основной язык документации: русский.** Русская версия является нормативной. Английская версия поддерживается как вторичное зеркало для международных пользователей.

# Архитектура Akronikl

```text
PWA / Browser
   │ minimal contextual request
   ▼
Akronikl Client
   │ HTTPS
   ▼
Secure API Gateway / Worker
   ├── auth/rate limit
   ├── secret storage
   ├── provider routing
   └── logging without secrets
   ▼
AI Provider(s)
```

## Запрещено
- API key в `index.html`, JS bundle, localStorage или публичном GitHub;
- слепо отправлять весь DOM/курс;
- позволять модели напрямую исполнять shell-команды на сервере;
- смешивать AI gateway и code runner без изоляции.

## Offline fallback
Локальные эвристики, статические подсказки, словарь ошибок и встроенные разборы продолжают работать без AI.
