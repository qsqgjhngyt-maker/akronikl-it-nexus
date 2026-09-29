# Требования к first-party deployment — v0.1.7-alpha.2.4.5

## Почему текущий production не подходит для включения cookie
Текущая топология использует разные внешние site-контексты:
- приложение — GitHub Pages;
- API — `workers.dev`.

`2.4.5` специально не превращает это в third-party cookie architecture.

## Допустимая будущая топология
До включения `FIRST_PARTY_SESSION_ENABLED=true` нужен один из вариантов:

1. приложение и API обслуживаются одним origin;
2. приложение и API находятся на контролируемых same-site HTTPS host-ах.

## Обязательный security checklist перед включением
- HTTPS на обоих endpoints;
- точный `ALLOWED_ORIGIN`;
- cookie `__Host-` без Domain;
- credentialed CORS;
- exact Origin gate;
- login / upgrade / logout;
- stale cookie cleanup;
- revoke current session;
- revoke all / device revoke;
- CSRF negative tests;
- wrong-Origin negative tests;
- desktop Chrome/Edge/Firefox;
- iPhone/Safari;
- Android/Chrome;
- rollback path на `nxs/nxk` до полного cutover.

## Запрет
Нельзя включать оба first-party env-флага в текущем production только ради теста.
Для реального cookie LIVE-теста сначала создаётся отдельный first-party deployment.
