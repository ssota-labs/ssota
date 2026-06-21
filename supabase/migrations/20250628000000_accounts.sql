-- Multi-tenant end-user partitions (Phase 5). A Project is the builder's agent
-- SaaS; `accounts` are the isolated spaces end users work in. Instance rows
-- (nodes/edges/tasks) already carry nullable `account_id` (20250627); this adds
-- the account registry + memberships. No recursive org/project for end users.

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "owner_user_id" uuid REFERENCES "profiles"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_project_slug_unique"
  ON "accounts" ("project_id", "slug");
CREATE INDEX IF NOT EXISTS "accounts_project_id_idx"
  ON "accounts" ("project_id");

CREATE TABLE IF NOT EXISTS "account_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'member',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_memberships_account_user_unique"
  ON "account_memberships" ("account_id", "user_id");

-- Partition-key indexes on instance tables for account-scoped reads.
CREATE INDEX IF NOT EXISTS "nodes_project_account_id_idx"
  ON "nodes" ("project_id", "account_id");
CREATE INDEX IF NOT EXISTS "edges_project_account_id_idx"
  ON "edges" ("project_id", "account_id");
CREATE INDEX IF NOT EXISTS "tasks_project_account_id_idx"
  ON "tasks" ("project_id", "account_id");

ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "accounts";
CREATE POLICY deny_all ON "accounts"
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "account_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account_memberships" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "account_memberships";
CREATE POLICY deny_all ON "account_memberships"
  FOR ALL TO public USING (false) WITH CHECK (false);
