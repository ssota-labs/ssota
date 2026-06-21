-- Per-account third-party connections via Vercel Connect (Phase 6 / Connect).
-- One row per account × connector. installationId scopes the agent's getToken
-- so each account acts on its own workspace (Slack team, GitHub org, …).

CREATE TABLE IF NOT EXISTS "account_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "connector" text NOT NULL,
  "installation_id" text,
  "tenant_id" text,
  "name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_connections_account_connector_unique"
  ON "account_connections" ("account_id", "connector");
CREATE INDEX IF NOT EXISTS "account_connections_project_id_idx"
  ON "account_connections" ("project_id");

ALTER TABLE "account_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account_connections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "account_connections";
CREATE POLICY deny_all ON "account_connections"
  FOR ALL TO public USING (false) WITH CHECK (false);
