CREATE TABLE IF NOT EXISTS request_quotas (
  id TEXT PRIMARY KEY,
  used INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_request_quotas_expiry ON request_quotas(expires_at);
