-- Console v2.7 graph instances (catalog SSOT is packages/contracts — no catalog tables).
--
-- Idempotent: archive_generic_runtime may have been skipped when editor_assets shared
-- version 20250621000000. Always tear down legacy graph tables before creating v2.7 schema.

ALTER TABLE IF EXISTS "tasks"
  DROP COLUMN IF EXISTS "workflow_id",
  DROP COLUMN IF EXISTS "target_node_id",
  DROP COLUMN IF EXISTS "source_action_log_id";

DROP INDEX IF EXISTS "tasks_project_target_node_idx";

DROP TABLE IF EXISTS "user_project_preferences" CASCADE;
DROP TABLE IF EXISTS "impact_queue" CASCADE;
DROP TABLE IF EXISTS "gates" CASCADE;
DROP TABLE IF EXISTS "edges" CASCADE;
DROP TABLE IF EXISTS "nodes" CASCADE;
DROP TABLE IF EXISTS "action_property_permissions" CASCADE;
DROP TABLE IF EXISTS "node_catalog" CASCADE;
DROP TABLE IF EXISTS "edge_catalog" CASCADE;
DROP TABLE IF EXISTS "action_catalog" CASCADE;
DROP TABLE IF EXISTS "workflows" CASCADE;
DROP TABLE IF EXISTS "action_log" CASCADE;
DROP TABLE IF EXISTS "archetypes" CASCADE;

DROP TYPE IF EXISTS "impact_queue_status" CASCADE;
DROP TYPE IF EXISTS "action_outcome" CASCADE;
DROP TYPE IF EXISTS "gate_status" CASCADE;
DROP TYPE IF EXISTS "permission_type" CASCADE;
DROP TYPE IF EXISTS "permission_operation" CASCADE;
DROP TYPE IF EXISTS "node_family" CASCADE;
DROP TYPE IF EXISTS "lifecycle_status" CASCADE;

CREATE TYPE "public"."lifecycle_status" AS ENUM(
  'Draft',
  'Active',
  'Archived',
  'Deleted'
);

CREATE TABLE "nodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "node_type" text NOT NULL,
  "title" text NOT NULL DEFAULT '',
  "properties" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "content" text,
  "lifecycle_status" "lifecycle_status" NOT NULL DEFAULT 'Draft',
  "schema_version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "edges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "edge_type" text NOT NULL,
  "source_node_id" uuid NOT NULL REFERENCES "nodes"("id") ON DELETE CASCADE,
  "target_node_id" uuid NOT NULL REFERENCES "nodes"("id") ON DELETE CASCADE,
  "properties" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "nodes_project_node_type_idx"
  ON "nodes" ("project_id", "node_type");

CREATE INDEX "nodes_project_lifecycle_status_idx"
  ON "nodes" ("project_id", "lifecycle_status");

CREATE INDEX "edges_project_source_node_id_idx"
  ON "edges" ("project_id", "source_node_id");

CREATE INDEX "edges_project_target_node_id_idx"
  ON "edges" ("project_id", "target_node_id");

ALTER TABLE "nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nodes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "nodes";
CREATE POLICY deny_all ON "nodes"
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "edges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "edges" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "edges";
CREATE POLICY deny_all ON "edges"
  FOR ALL TO public USING (false) WITH CHECK (false);
