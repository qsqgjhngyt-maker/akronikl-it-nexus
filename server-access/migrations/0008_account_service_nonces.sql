-- PLANNED: только локальный кандидат, НЕ применять к production D1.
-- Однократность подписанных BFF → Worker Account-запросов.
-- Таблица не содержит session secret, его хеш или межсервисный ключ.
CREATE TABLE IF NOT EXISTS account_service_nonces (
  nonce TEXT NOT NULL PRIMARY KEY CHECK (length(nonce) = 32),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_account_service_nonces_expiry
  ON account_service_nonces(expires_at);

-- До отдельного migration gate определить retention/очистку истёкших nonce.
-- SecurityEvent.loginMethodId потребует отдельного additive решения;
-- не добавлять невалидированные method IDs в произвольный metadata_json.
