CREATE TABLE IF NOT EXISTS verification_sessions (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_expiry ON verification_sessions(expires_at);
