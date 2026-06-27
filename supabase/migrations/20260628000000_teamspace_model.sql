-- Org > Teamspace model: projects → teamspaces, catalog org-scoped, instances teamspace-scoped.

-- 1) Rename projects → teamspaces
ALTER TABLE projects RENAME TO teamspaces;
ALTER INDEX IF EXISTS projects_org_slug_unique RENAME TO teamspaces_org_slug_unique;
ALTER INDEX IF EXISTS projects_pkey RENAME TO teamspaces_pkey;

-- 2) Catalog: add organization_id, backfill, dedupe, drop project_id
ALTER TABLE node_catalog ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE node_catalog nc
SET organization_id = ts.organization_id
FROM teamspaces ts
WHERE nc.project_id = ts.id;

-- Keep one catalog row per (organization_id, key) — prefer lexicographically first id
WITH ranked AS (
  SELECT id,
    organization_id,
    key,
    ROW_NUMBER() OVER (PARTITION BY organization_id, key ORDER BY id) AS rn
  FROM node_catalog
  WHERE organization_id IS NOT NULL
),
canonical AS (
  SELECT organization_id, key, id AS keep_id
  FROM ranked
  WHERE rn = 1
),
dupes AS (
  SELECT nc.id AS old_id, c.keep_id
  FROM node_catalog nc
  INNER JOIN canonical c ON c.organization_id = nc.organization_id AND c.key = nc.key
  WHERE nc.id <> c.keep_id
)
UPDATE nodes n SET node_catalog_id = d.keep_id FROM dupes d WHERE n.node_catalog_id = d.old_id;

DELETE FROM node_catalog nc
USING (
  SELECT id FROM node_catalog nc2
  WHERE EXISTS (
    SELECT 1 FROM node_catalog nc3
    WHERE nc3.organization_id = nc2.organization_id
      AND nc3.key = nc2.key
      AND nc3.id < nc2.id
  )
) dup WHERE nc.id = dup.id;

ALTER TABLE node_catalog ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE node_catalog DROP CONSTRAINT IF EXISTS node_catalog_project_id_fkey;
ALTER TABLE node_catalog DROP COLUMN project_id;
DROP INDEX IF EXISTS node_catalog_project_key_unique;
DROP INDEX IF EXISTS node_catalog_project_id_idx;
CREATE UNIQUE INDEX node_catalog_organization_key_unique ON node_catalog (organization_id, key);
CREATE INDEX node_catalog_organization_id_idx ON node_catalog (organization_id);

-- edge_catalog same pattern
ALTER TABLE edge_catalog ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE edge_catalog ec
SET organization_id = ts.organization_id
FROM teamspaces ts
WHERE ec.project_id = ts.id;

WITH ranked AS (
  SELECT id,
    organization_id,
    key,
    ROW_NUMBER() OVER (PARTITION BY organization_id, key ORDER BY id) AS rn
  FROM edge_catalog
  WHERE organization_id IS NOT NULL
),
canonical AS (
  SELECT organization_id, key, id AS keep_id
  FROM ranked
  WHERE rn = 1
),
dupes AS (
  SELECT ec.id AS old_id, c.keep_id
  FROM edge_catalog ec
  INNER JOIN canonical c ON c.organization_id = ec.organization_id AND c.key = ec.key
  WHERE ec.id <> c.keep_id
)
UPDATE edges e SET edge_catalog_id = d.keep_id FROM dupes d WHERE e.edge_catalog_id = d.old_id;

DELETE FROM edge_catalog ec
USING (
  SELECT id FROM edge_catalog ec2
  WHERE EXISTS (
    SELECT 1 FROM edge_catalog ec3
    WHERE ec3.organization_id = ec2.organization_id
      AND ec3.key = ec2.key
      AND ec3.id < ec2.id
  )
) dup WHERE ec.id = dup.id;

ALTER TABLE edge_catalog ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE edge_catalog DROP CONSTRAINT IF EXISTS edge_catalog_project_id_fkey;
ALTER TABLE edge_catalog DROP COLUMN project_id;
DROP INDEX IF EXISTS edge_catalog_project_key_unique;
DROP INDEX IF EXISTS edge_catalog_project_id_idx;
CREATE UNIQUE INDEX edge_catalog_organization_key_unique ON edge_catalog (organization_id, key);
CREATE INDEX edge_catalog_organization_id_idx ON edge_catalog (organization_id);

-- 3) Instance / ops tables: project_id → teamspace_id
ALTER TABLE nodes RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_project_id_fkey;
ALTER TABLE nodes ADD CONSTRAINT nodes_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;
-- org-shared instances (nullable teamspace)
ALTER TABLE nodes ALTER COLUMN teamspace_id DROP NOT NULL;
DROP INDEX IF EXISTS nodes_project_node_catalog_id_idx;
DROP INDEX IF EXISTS nodes_project_lifecycle_status_idx;
CREATE INDEX nodes_teamspace_node_catalog_id_idx ON nodes (teamspace_id, node_catalog_id);
CREATE INDEX nodes_teamspace_lifecycle_status_idx ON nodes (teamspace_id, (properties->>'lifecycleStatus'));

ALTER TABLE edges RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_project_id_fkey;
ALTER TABLE edges ADD CONSTRAINT edges_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;
ALTER TABLE edges ALTER COLUMN teamspace_id DROP NOT NULL;
DROP INDEX IF EXISTS edges_project_source_node_id_idx;
DROP INDEX IF EXISTS edges_project_target_node_id_idx;
DROP INDEX IF EXISTS edges_project_edge_catalog_id_idx;
CREATE INDEX edges_teamspace_source_node_id_idx ON edges (teamspace_id, source_node_id);
CREATE INDEX edges_teamspace_target_node_id_idx ON edges (teamspace_id, target_node_id);
CREATE INDEX edges_teamspace_edge_catalog_id_idx ON edges (teamspace_id, edge_catalog_id);

ALTER TABLE pages RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_project_id_fkey;
ALTER TABLE pages ADD CONSTRAINT pages_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS pages_project_parent_id_idx;
DROP INDEX IF EXISTS pages_project_id_idx;
DROP INDEX IF EXISTS pages_project_applies_to_node_type_idx;
DROP INDEX IF EXISTS pages_project_subject_node_id_idx;
DROP INDEX IF EXISTS pages_project_slug_unique;
CREATE INDEX pages_teamspace_parent_id_idx ON pages (teamspace_id, parent_id);
CREATE INDEX pages_teamspace_id_idx ON pages (teamspace_id);
CREATE INDEX pages_teamspace_applies_to_node_type_idx ON pages (teamspace_id, applies_to_node_type);
CREATE INDEX pages_teamspace_subject_node_id_idx ON pages (teamspace_id, subject_node_id);
CREATE UNIQUE INDEX pages_teamspace_slug_unique ON pages (teamspace_id, slug) WHERE slug IS NOT NULL;

ALTER TABLE tasks RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id);
DROP INDEX IF EXISTS tasks_project_idempotency_unique;
DROP INDEX IF EXISTS tasks_project_status_idx;
DROP INDEX IF EXISTS tasks_project_workflow_instruction_id_idx;
DROP INDEX IF EXISTS tasks_project_assignee_idx;
DROP INDEX IF EXISTS tasks_project_subject_id_idx;
DROP INDEX IF EXISTS tasks_project_target_node_idx;
CREATE UNIQUE INDEX tasks_teamspace_idempotency_unique ON tasks (teamspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX tasks_teamspace_status_idx ON tasks (teamspace_id, status);
CREATE INDEX tasks_teamspace_workflow_instruction_id_idx ON tasks (teamspace_id, workflow_instruction_id);
CREATE INDEX tasks_teamspace_assignee_idx ON tasks (teamspace_id, assignee);
CREATE INDEX tasks_teamspace_subject_id_idx ON tasks (teamspace_id, subject_id);
CREATE INDEX tasks_teamspace_target_node_idx ON tasks (teamspace_id, target_node_id);

ALTER TABLE accounts RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_project_id_fkey;
ALTER TABLE accounts ADD CONSTRAINT accounts_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS accounts_project_slug_unique;
DROP INDEX IF EXISTS accounts_project_id_idx;
CREATE UNIQUE INDEX accounts_teamspace_slug_unique ON accounts (teamspace_id, slug);
CREATE INDEX accounts_teamspace_id_idx ON accounts (teamspace_id);

ALTER TABLE account_connections RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE account_connections DROP CONSTRAINT IF EXISTS account_connections_project_id_fkey;
ALTER TABLE account_connections ADD CONSTRAINT account_connections_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS account_connections_project_id_idx;
CREATE INDEX account_connections_teamspace_id_idx ON account_connections (teamspace_id);

ALTER TABLE chat_workspaces RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE chat_workspaces DROP CONSTRAINT IF EXISTS chat_workspaces_project_id_fkey;
ALTER TABLE chat_workspaces ADD CONSTRAINT chat_workspaces_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS chat_workspaces_project_id_idx;
CREATE INDEX chat_workspaces_teamspace_id_idx ON chat_workspaces (teamspace_id);

ALTER TABLE workflow_instructions RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE workflow_instructions DROP CONSTRAINT IF EXISTS workflow_instructions_project_id_fkey;
ALTER TABLE workflow_instructions ADD CONSTRAINT workflow_instructions_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS workflow_instructions_project_key_unique;
DROP INDEX IF EXISTS workflow_instructions_project_account_key_unique;
DROP INDEX IF EXISTS workflow_instructions_project_id_idx;
CREATE UNIQUE INDEX workflow_instructions_teamspace_key_unique ON workflow_instructions (teamspace_id, key) WHERE account_id IS NULL;
CREATE UNIQUE INDEX workflow_instructions_teamspace_account_key_unique ON workflow_instructions (teamspace_id, account_id, key) WHERE account_id IS NOT NULL;
CREATE INDEX workflow_instructions_teamspace_id_idx ON workflow_instructions (teamspace_id);

ALTER TABLE schedules RENAME COLUMN project_id TO teamspace_id;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_project_id_fkey;
ALTER TABLE schedules ADD CONSTRAINT schedules_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS schedules_project_id_idx;
CREATE INDEX schedules_teamspace_id_idx ON schedules (teamspace_id);

-- page_view_states and other tables if they have project_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_view_states' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE page_view_states RENAME COLUMN project_id TO teamspace_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_runs' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE agent_runs RENAME COLUMN project_id TO teamspace_id;
  END IF;
END $$;

-- FTS search columns reference project_id in generated SQL — rebuild if needed (handled by app layer)
