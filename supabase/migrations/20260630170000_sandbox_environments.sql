-- Sandbox environment tables for Vercel Sandbox-backed execution environments.

CREATE TYPE "public"."sandbox_session_status" AS ENUM(
  'provisioning',
  'ready',
  'running',
  'stopped',
  'failed'
);

CREATE TYPE "public"."sandbox_setup_status" AS ENUM(
  'pending',
  'cloning',
  'installing',
  'ready',
  'failed'
);

CREATE TYPE "public"."sandbox_snapshot_kind" AS ENUM('base', 'project', 'run');

CREATE TABLE "sandbox_environments" (
  "id" uuid NOT NULL,
  "teamspace_id" uuid NOT NULL REFERENCES "teamspaces"("id") ON DELETE CASCADE,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "runtime" text NOT NULL DEFAULT 'node24',
  "working_root" text NOT NULL DEFAULT '/vercel/sandbox',
  "primary_source_key" text,
  "setup_script" text,
  "env_policy" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ports" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "base_snapshot_id" uuid,
  "latest_project_snapshot_id" uuid,
  "persistence_policy" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("teamspace_id", "id")
);

CREATE UNIQUE INDEX "sandbox_environments_teamspace_key_unique"
  ON "sandbox_environments" ("teamspace_id", "key")
  WHERE "account_id" IS NULL;

CREATE UNIQUE INDEX "sandbox_environments_teamspace_account_key_unique"
  ON "sandbox_environments" ("teamspace_id", "account_id", "key")
  WHERE "account_id" IS NOT NULL;

CREATE INDEX "sandbox_environments_teamspace_id_idx"
  ON "sandbox_environments" ("teamspace_id");

CREATE TABLE "sandbox_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teamspace_id" uuid NOT NULL REFERENCES "teamspaces"("id") ON DELETE CASCADE,
  "sandbox_environment_id" uuid NOT NULL,
  "key" text NOT NULL,
  "url" text NOT NULL,
  "provider" text NOT NULL DEFAULT 'github',
  "repo_owner" text,
  "repo_name" text,
  "branch" text NOT NULL DEFAULT 'main',
  "revision" text,
  "path" text NOT NULL,
  "primary" boolean NOT NULL DEFAULT false,
  "auth_policy" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "sandbox_sources_environment_fk"
    FOREIGN KEY ("teamspace_id", "sandbox_environment_id")
    REFERENCES "sandbox_environments" ("teamspace_id", "id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX "sandbox_sources_env_key_unique"
  ON "sandbox_sources" ("sandbox_environment_id", "key");

CREATE TABLE "sandbox_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teamspace_id" uuid NOT NULL REFERENCES "teamspaces"("id") ON DELETE CASCADE,
  "sandbox_environment_id" uuid NOT NULL,
  "vercel_sandbox_id" text,
  "sandbox_name" text,
  "status" "sandbox_session_status" NOT NULL DEFAULT 'provisioning',
  "current_snapshot_id" uuid,
  "port_urls" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "setup_status" "sandbox_setup_status" NOT NULL DEFAULT 'pending',
  "allowed_roots" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "last_activity_at" timestamptz,
  "owner_agent_run_id" uuid,
  "owner_task_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "sandbox_sessions_environment_fk"
    FOREIGN KEY ("teamspace_id", "sandbox_environment_id")
    REFERENCES "sandbox_environments" ("teamspace_id", "id")
    ON DELETE CASCADE
);

CREATE INDEX "sandbox_sessions_teamspace_id_idx"
  ON "sandbox_sessions" ("teamspace_id");

CREATE INDEX "sandbox_sessions_environment_id_idx"
  ON "sandbox_sessions" ("sandbox_environment_id");

CREATE TABLE "sandbox_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teamspace_id" uuid NOT NULL REFERENCES "teamspaces"("id") ON DELETE CASCADE,
  "sandbox_environment_id" uuid NOT NULL,
  "vercel_snapshot_id" text,
  "kind" "sandbox_snapshot_kind" NOT NULL,
  "label" text NOT NULL,
  "source_revisions" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by_agent_run_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "sandbox_snapshots_environment_fk"
    FOREIGN KEY ("teamspace_id", "sandbox_environment_id")
    REFERENCES "sandbox_environments" ("teamspace_id", "id")
    ON DELETE CASCADE
);

CREATE INDEX "sandbox_snapshots_environment_id_idx"
  ON "sandbox_snapshots" ("sandbox_environment_id");

ALTER TABLE "sandbox_environments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sandbox_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sandbox_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sandbox_snapshots" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_sandbox_environments" ON "sandbox_environments"
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "deny_all_sandbox_sources" ON "sandbox_sources"
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "deny_all_sandbox_sessions" ON "sandbox_sessions"
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "deny_all_sandbox_snapshots" ON "sandbox_snapshots"
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
