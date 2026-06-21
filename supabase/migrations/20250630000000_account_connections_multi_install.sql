-- Multi-workspace connections. Previously one row per (account, connector); now
-- one row per (account, connector, installation) so connectors that support
-- multiple workspaces (Slack teams, GitHub orgs, Discord guilds, Notion
-- workspaces) can be connected several times. Single-install connectors use an
-- empty-string installation_id as a stable key.

ALTER TABLE "account_connections"
  ALTER COLUMN "installation_id" SET DEFAULT '';
UPDATE "account_connections"
  SET "installation_id" = '' WHERE "installation_id" IS NULL;
ALTER TABLE "account_connections"
  ALTER COLUMN "installation_id" SET NOT NULL;

DROP INDEX IF EXISTS "account_connections_account_connector_unique";
CREATE UNIQUE INDEX IF NOT EXISTS
  "account_connections_account_connector_installation_unique"
  ON "account_connections" ("account_id", "connector", "installation_id");
