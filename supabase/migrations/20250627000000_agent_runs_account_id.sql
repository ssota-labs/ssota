-- Agent runtime (Phase 1): durable agent run ↔ task bridge + account_id partition.
-- account_id is nullable everywhere in Phase 1 (always null = builder/shared scope);
-- it becomes the end-user data partition in Phase 5.

-- End-user data partition columns (nullable; shared = NULL)
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "account_id" uuid;
ALTER TABLE "nodes" ADD COLUMN IF NOT EXISTS "account_id" uuid;
ALTER TABLE "edges" ADD COLUMN IF NOT EXISTS "account_id" uuid;

CREATE TABLE IF NOT EXISTS "agent_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "account_id" uuid,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "workflow_run_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'running',
  "model" text,
  "usage" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "agent_runs_project_id_idx"
  ON "agent_runs" ("project_id");

CREATE INDEX IF NOT EXISTS "agent_runs_task_id_idx"
  ON "agent_runs" ("task_id");

CREATE UNIQUE INDEX IF NOT EXISTS "agent_runs_workflow_run_id_unique"
  ON "agent_runs" ("workflow_run_id");

ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_runs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "agent_runs";
CREATE POLICY deny_all ON "agent_runs"
  FOR ALL TO public USING (false) WITH CHECK (false);
