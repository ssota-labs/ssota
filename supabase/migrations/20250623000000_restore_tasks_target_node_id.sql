-- Restore tasks.target_node_id for Console v2.7 graph linking (dropped in archive_generic_runtime).
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "target_node_id" uuid REFERENCES "nodes"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "tasks_project_target_node_idx"
  ON "tasks" ("project_id", "target_node_id");
