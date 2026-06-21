-- In-app web chat persistence. A thread holds the multi-turn history for one
-- console chat; messages store AI SDK UIMessage parts so the UI rehydrates on
-- reload. Each user turn still spawns a durable agent task (tasks.context.chat).

CREATE TABLE IF NOT EXISTS "chat_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "account_id" uuid,
  "title" text NOT NULL DEFAULT 'New chat',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_threads_project_account_id_idx"
  ON "chat_threads" ("project_id", "account_id");

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL REFERENCES "chat_threads"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "parts" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_messages_thread_id_idx"
  ON "chat_messages" ("thread_id");

ALTER TABLE "chat_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_threads" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "chat_threads";
CREATE POLICY deny_all ON "chat_threads"
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "chat_messages";
CREATE POLICY deny_all ON "chat_messages"
  FOR ALL TO public USING (false) WITH CHECK (false);
