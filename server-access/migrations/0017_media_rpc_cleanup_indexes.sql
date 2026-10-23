-- Инцидент входа 24.10.2026: очистка media RPC исчерпала суточный лимит D1.
-- Дополнительный индекс для существующего запроса admin-service.mjs.
-- Состав строк, UNIQUE nonce, TTL, namespaces и лимиты удаления не меняются.
-- Частичный индекс исключает legacy nonce, которые намеренно сохраняются.
CREATE INDEX IF NOT EXISTS idx_nexus_admin_media_nonce_expiry
  ON nexus_admin_nonces(expires_at, nonce)
  WHERE nonce LIKE 'mp1:%';
