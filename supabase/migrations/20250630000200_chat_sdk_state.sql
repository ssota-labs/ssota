-- Chat SDK (chat-sdk.dev) Postgres state backend.
--
-- These tables back `createPostgresState({ url: DATABASE_URL })` in
-- apps/web/lib/chat/bot.ts — thread subscriptions, distributed locks (dedupe),
-- key/value cache, ordered lists, and per-thread queues for the Slack/Discord/
-- Telegram bots.
--
-- The DDL below is copied VERBATIM from `@chat-adapter/state-pg@4.31.0`
-- (PostgresStateAdapter.ensureSchema). The adapter still runs ensureSchema() on
-- connect, but it is CREATE TABLE IF NOT EXISTS, so once this migration has run
-- it is a harmless no-op — this file is the source of truth. The adapter does
-- NOT ALTER existing tables, so on a state-pg upgrade re-sync this DDL by hand
-- and add a follow-up migration. Keep @chat-adapter/state-pg pinned.

CREATE TABLE IF NOT EXISTS chat_state_subscriptions (
  key_prefix text NOT NULL,
  thread_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_prefix, thread_id)
);

CREATE TABLE IF NOT EXISTS chat_state_locks (
  key_prefix text NOT NULL,
  thread_id text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_prefix, thread_id)
);

CREATE TABLE IF NOT EXISTS chat_state_cache (
  key_prefix text NOT NULL,
  cache_key text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_prefix, cache_key)
);

CREATE INDEX IF NOT EXISTS chat_state_locks_expires_idx
  ON chat_state_locks (expires_at);

CREATE INDEX IF NOT EXISTS chat_state_cache_expires_idx
  ON chat_state_cache (expires_at);

CREATE TABLE IF NOT EXISTS chat_state_lists (
  key_prefix text NOT NULL,
  list_key text NOT NULL,
  seq bigserial NOT NULL,
  value text NOT NULL,
  expires_at timestamptz,
  PRIMARY KEY (key_prefix, list_key, seq)
);

CREATE INDEX IF NOT EXISTS chat_state_lists_expires_idx
  ON chat_state_lists (expires_at);

CREATE TABLE IF NOT EXISTS chat_state_queues (
  key_prefix text NOT NULL,
  thread_id text NOT NULL,
  seq bigserial NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (key_prefix, thread_id, seq)
);

CREATE INDEX IF NOT EXISTS chat_state_queues_expires_idx
  ON chat_state_queues (expires_at);

-- Match the repo-wide posture: deny all access via PostgREST (anon/authenticated).
-- The bot connects with a BYPASSRLS role over DATABASE_URL, so FORCE RLS does not
-- affect it; this only closes off the public API surface (clears UNRESTRICTED).
ALTER TABLE chat_state_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON chat_state_subscriptions;
CREATE POLICY deny_all ON chat_state_subscriptions
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE chat_state_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_locks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON chat_state_locks;
CREATE POLICY deny_all ON chat_state_locks
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE chat_state_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_cache FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON chat_state_cache;
CREATE POLICY deny_all ON chat_state_cache
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE chat_state_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_lists FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON chat_state_lists;
CREATE POLICY deny_all ON chat_state_lists
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE chat_state_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_queues FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON chat_state_queues;
CREATE POLICY deny_all ON chat_state_queues
  FOR ALL TO public USING (false) WITH CHECK (false);
