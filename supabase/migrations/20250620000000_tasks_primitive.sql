-- Operational tasks primitive — runtime work units separate from graph nodes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_status'
  ) THEN
    CREATE TYPE "public"."task_status" AS ENUM(
      'pending',
      'ready',
      'running',
      'blocked',
      'done',
      'cancelled',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "workflow_key" text NOT NULL,
  "workflow_id" uuid REFERENCES "workflows"("id"),
  "title" text NOT NULL,
  "status" "task_status" DEFAULT 'pending' NOT NULL,
  "executor_type" "executor_type" DEFAULT 'Agent' NOT NULL,
  "assignee" text,
  "subject_id" text,
  "target_node_id" uuid REFERENCES "nodes"("id") ON DELETE SET NULL,
  "parent_task_id" uuid REFERENCES "tasks"("id") ON DELETE SET NULL,
  "source_action_log_id" uuid REFERENCES "action_log"("id"),
  "context" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "acceptance_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "idempotency_key" text,
  "result" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tasks_project_idempotency_unique"
  ON "tasks" ("project_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "tasks_project_status_idx"
  ON "tasks" ("project_id", "status");

CREATE INDEX IF NOT EXISTS "tasks_project_workflow_key_idx"
  ON "tasks" ("project_id", "workflow_key");

CREATE INDEX IF NOT EXISTS "tasks_project_assignee_idx"
  ON "tasks" ("project_id", "assignee");

CREATE INDEX IF NOT EXISTS "tasks_project_subject_id_idx"
  ON "tasks" ("project_id", "subject_id");

CREATE INDEX IF NOT EXISTS "tasks_project_target_node_idx"
  ON "tasks" ("project_id", "target_node_id");

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all ON "tasks";
CREATE POLICY deny_all ON "tasks"
  FOR ALL TO public
  USING (false)
  WITH CHECK (false);
