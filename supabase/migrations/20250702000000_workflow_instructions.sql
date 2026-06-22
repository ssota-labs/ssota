-- Replace legacy `workflows` (markdown + category/cadence meta) with BlockNote
-- `workflow_instructions`, task FK, main instruction pointers, schedules, and
-- agent_runs runtime kinds.

CREATE TABLE IF NOT EXISTS "workflow_instructions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "content" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_instructions_project_key_unique"
  ON "workflow_instructions" ("project_id", "key")
  WHERE "account_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_instructions_project_account_key_unique"
  ON "workflow_instructions" ("project_id", "account_id", "key")
  WHERE "account_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "workflow_instructions_project_id_idx"
  ON "workflow_instructions" ("project_id");

-- Migrate workflows → workflow_instructions (markdown → BlockNote paragraph wrap)
INSERT INTO "workflow_instructions" (
  "project_id",
  "key",
  "name",
  "description",
  "content",
  "created_at",
  "updated_at"
)
SELECT
  w."project_id",
  w."workflow_key",
  w."title",
  '',
  jsonb_build_array(
    jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', w."instruction")
      )
    )
  ),
  w."created_at",
  w."updated_at"
FROM "workflows" w
ON CONFLICT DO NOTHING;

-- tasks: add workflow_instruction_id, backfill, drop workflow_key
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "workflow_instruction_id" uuid;

UPDATE "tasks" t
SET "workflow_instruction_id" = wi."id"
FROM "workflow_instructions" wi
WHERE wi."project_id" = t."project_id"
  AND wi."account_id" IS NULL
  AND wi."key" = t."workflow_key"
  AND t."workflow_instruction_id" IS NULL;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_workflow_instruction_id_fkey"
  FOREIGN KEY ("workflow_instruction_id")
  REFERENCES "workflow_instructions"("id")
  ON DELETE SET NULL;

DROP INDEX IF EXISTS "tasks_project_workflow_key_idx";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "workflow_key";

CREATE INDEX IF NOT EXISTS "tasks_project_workflow_instruction_id_idx"
  ON "tasks" ("project_id", "workflow_instruction_id");

-- Main instruction pointers
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "main_workflow_instruction_id" uuid;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_main_workflow_instruction_id_fkey"
  FOREIGN KEY ("main_workflow_instruction_id")
  REFERENCES "workflow_instructions"("id")
  ON DELETE SET NULL;

UPDATE "projects" p
SET "main_workflow_instruction_id" = wi."id"
FROM "workflow_instructions" wi
WHERE wi."project_id" = p."id"
  AND wi."account_id" IS NULL
  AND wi."key" = 'agent.main'
  AND p."main_workflow_instruction_id" IS NULL;

ALTER TABLE "accounts"
  ADD COLUMN IF NOT EXISTS "main_workflow_instruction_id" uuid;

ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_main_workflow_instruction_id_fkey"
  FOREIGN KEY ("main_workflow_instruction_id")
  REFERENCES "workflow_instructions"("id")
  ON DELETE SET NULL;

-- Scheduler runtime
CREATE TABLE IF NOT EXISTS "schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE CASCADE,
  "workflow_instruction_id" uuid NOT NULL REFERENCES "workflow_instructions"("id") ON DELETE CASCADE,
  "cron_expression" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "idempotency_prefix" text NOT NULL DEFAULT '',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "schedules_project_id_idx"
  ON "schedules" ("project_id");

-- agent_runs: runtime_kind + nullable task/thread/schedule
DO $$ BEGIN
  CREATE TYPE "agent_runtime_kind" AS ENUM ('main', 'task', 'scheduler');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "runtime_kind" "agent_runtime_kind" NOT NULL DEFAULT 'task';
ALTER TABLE "agent_runs" ALTER COLUMN "task_id" DROP NOT NULL;
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "thread_id" uuid;
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "schedule_id" uuid;

ALTER TABLE "agent_runs"
  ADD CONSTRAINT "agent_runs_thread_id_fkey"
  FOREIGN KEY ("thread_id")
  REFERENCES "chat_threads"("id")
  ON DELETE CASCADE;

ALTER TABLE "agent_runs"
  ADD CONSTRAINT "agent_runs_schedule_id_fkey"
  FOREIGN KEY ("schedule_id")
  REFERENCES "schedules"("id")
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "agent_runs_thread_id_idx"
  ON "agent_runs" ("thread_id");

CREATE INDEX IF NOT EXISTS "agent_runs_schedule_id_idx"
  ON "agent_runs" ("schedule_id");

-- Drop legacy workflows table
DROP TABLE IF EXISTS "workflows" CASCADE;

ALTER TABLE "workflow_instructions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_instructions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "workflow_instructions";
CREATE POLICY deny_all ON "workflow_instructions"
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "schedules";
CREATE POLICY deny_all ON "schedules"
  FOR ALL TO public USING (false) WITH CHECK (false);
