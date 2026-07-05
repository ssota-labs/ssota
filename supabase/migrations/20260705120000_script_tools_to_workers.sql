-- Rename script_tools → workers; add kind + kind_config; migrate tool rows.

ALTER TABLE script_tools RENAME TO workers;

ALTER INDEX IF EXISTS script_tools_teamspace_key_unique
  RENAME TO workers_teamspace_key_unique;
ALTER INDEX IF EXISTS script_tools_teamspace_account_key_unique
  RENAME TO workers_teamspace_account_key_unique;
ALTER INDEX IF EXISTS script_tools_teamspace_id_idx
  RENAME TO workers_teamspace_id_idx;

ALTER TABLE workers
  ADD COLUMN kind text NOT NULL DEFAULT 'tool',
  ADD COLUMN kind_config jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE workers
SET
  kind = 'tool',
  kind_config = jsonb_build_object(
    'permissions', COALESCE(permissions, '{}'::jsonb),
    'defaultConfig', COALESCE(default_config, '{}'::jsonb)
  );

ALTER TABLE workers
  DROP COLUMN permissions,
  DROP COLUMN default_config;

ALTER TABLE agent_definition_script_tools RENAME TO agent_definition_workers;

ALTER TABLE agent_definition_workers
  RENAME COLUMN script_tool_id TO worker_id;

ALTER INDEX IF EXISTS agent_definition_script_tools_pk
  RENAME TO agent_definition_workers_pk;

ALTER TABLE agent_definition_workers
  DROP CONSTRAINT IF EXISTS agent_definition_script_tools_script_tool_id_fkey;

ALTER TABLE agent_definition_workers
  ADD CONSTRAINT agent_definition_workers_worker_id_fkey
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

ALTER POLICY deny_all_script_tools ON workers RENAME TO deny_all_workers;

DROP POLICY IF EXISTS deny_all_agent_definition_script_tools ON agent_definition_workers;
CREATE POLICY deny_all_agent_definition_workers
  ON agent_definition_workers FOR ALL USING (false);

-- Demo workers (idempotent on empty teamspaces via seed script; optional rows for ssota-dev)
-- Skipped here — adapter seed can insert after teamspace exists.

ALTER TYPE agent_runtime_kind ADD VALUE IF NOT EXISTS 'worker';
