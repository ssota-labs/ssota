-- Map a chat workspace (Slack team / Discord guild / Telegram chat) to a
-- project (+ optional account). Lets a creator connect a workspace to one of
-- their own projects without a separate tenant deployment; inbound messages
-- resolve their project by workspace_key (global-unique).

CREATE TABLE IF NOT EXISTS "chat_workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  "platform" text NOT NULL,
  "workspace_key" text NOT NULL,
  "name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_workspaces_workspace_key_unique"
  ON "chat_workspaces" ("workspace_key");
CREATE INDEX IF NOT EXISTS "chat_workspaces_project_id_idx"
  ON "chat_workspaces" ("project_id");

ALTER TABLE "chat_workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_workspaces" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "chat_workspaces";
CREATE POLICY deny_all ON "chat_workspaces"
  FOR ALL TO public USING (false) WITH CHECK (false);
