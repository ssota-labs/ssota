-- Workflow definitions as a core, per-project concept (peer of node/edge catalog
-- and tasks), NOT domain content. Previously the workflow registry (agent.main,
-- orchestrator.*, work.*) was code-baked and embedded into the agent system
-- prompt at build time, so it could not be edited per project. This table holds
-- the definitions; every project is bootstrap-seeded from the embedded registry
-- and rows are then tenant-editable / agent-authorable. `tasks.workflow_key` is a
-- soft reference to `workflow_key` here (no hard FK, to preserve registry fallback).

CREATE TABLE IF NOT EXISTS "workflows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "workflow_key" text NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "cadence_hint" text,
  "default_executor_type" "executor_type",
  "default_status" "task_status",
  "instruction" text NOT NULL,
  "lifecycle_status" text NOT NULL DEFAULT 'Active',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "workflows_project_workflow_key_unique"
  ON "workflows" ("project_id", "workflow_key");
CREATE INDEX IF NOT EXISTS "workflows_project_id_idx"
  ON "workflows" ("project_id");

ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflows" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "workflows";
CREATE POLICY deny_all ON "workflows"
  FOR ALL TO public USING (false) WITH CHECK (false);
