-- Archive generic context graph runtime from the active public schema.
-- Legacy source files are preserved under archive/generic-runtime in the repo.

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
