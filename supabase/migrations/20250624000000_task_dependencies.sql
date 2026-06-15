-- Task-to-task execution dependencies (blocks edges).

CREATE TABLE IF NOT EXISTS "task_dependencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "blocker_task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "blocked_task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "kind" text NOT NULL DEFAULT 'blocks',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "task_dependencies_blocker_blocked_distinct"
    CHECK ("blocker_task_id" <> "blocked_task_id"),
  CONSTRAINT "task_dependencies_project_blocker_blocked_unique"
    UNIQUE ("project_id", "blocker_task_id", "blocked_task_id")
);

CREATE INDEX IF NOT EXISTS "task_dependencies_blocked_idx"
  ON "task_dependencies" ("project_id", "blocked_task_id");

CREATE INDEX IF NOT EXISTS "task_dependencies_blocker_idx"
  ON "task_dependencies" ("project_id", "blocker_task_id");

ALTER TABLE "task_dependencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_dependencies" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all ON "task_dependencies";
CREATE POLICY deny_all ON "task_dependencies"
  FOR ALL TO public
  USING (false)
  WITH CHECK (false);
