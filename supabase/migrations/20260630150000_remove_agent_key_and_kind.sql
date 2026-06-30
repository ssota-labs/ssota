-- Remove agent key + agent_kind; identify agents by UUID only.

ALTER TABLE tasks DROP COLUMN IF EXISTS agent_key;
ALTER TABLE agent_runs DROP COLUMN IF EXISTS agent_key;
ALTER TABLE agent_runs DROP COLUMN IF EXISTS agent_kind;

DROP INDEX IF EXISTS agent_definitions_teamspace_key_unique;
DROP INDEX IF EXISTS agent_definitions_teamspace_account_key_unique;

ALTER TABLE agent_definitions
  DROP COLUMN IF EXISTS key,
  DROP COLUMN IF EXISTS agent_kind,
  ADD COLUMN IF NOT EXISTS is_main boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_only boolean NOT NULL DEFAULT false;

DROP TYPE IF EXISTS agent_kind;

-- Rename schedule target: specialist_agent → agent
ALTER TYPE schedule_target_type RENAME VALUE 'specialist_agent' TO 'agent';
