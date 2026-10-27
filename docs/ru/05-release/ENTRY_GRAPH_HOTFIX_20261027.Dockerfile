FROM cr.yandex/crp26t5as9vgmqmvsau4/nexus-pilot-backend@sha256:14b9275ccef9b68f21e0d99b2b4d3b2797b5c9d84039249b678283dfa8498456
COPY --chown=node:node public/page.js public/passkey-client.js public/entry.js public/oauth-client.js /app/public/
