-- Stable builtin agent UUIDs are scoped per teamspace: same id in each teamspace.

ALTER TABLE agent_definition_script_tools
  DROP CONSTRAINT IF EXISTS agent_definition_script_tools_agent_definition_id_fkey;

ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_agent_definition_id_fkey;
ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_workflow_instruction_id_fkey;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_agent_definition_id_fkey;
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_workflow_instruction_id_fkey;

ALTER TABLE agent_runs
  DROP CONSTRAINT IF EXISTS agent_runs_agent_definition_id_fkey;

ALTER TABLE agent_definitions
  DROP CONSTRAINT IF EXISTS workflow_instructions_pkey;

ALTER TABLE agent_definitions
  DROP CONSTRAINT IF EXISTS agent_definitions_pkey;

ALTER TABLE agent_definitions
  ADD PRIMARY KEY (teamspace_id, id);

ALTER TABLE agent_definition_script_tools
  ADD COLUMN IF NOT EXISTS teamspace_id uuid;

UPDATE agent_definition_script_tools jst
SET teamspace_id = ad.teamspace_id
FROM agent_definitions ad
WHERE ad.id = jst.agent_definition_id
  AND jst.teamspace_id IS NULL;

DELETE FROM agent_definition_script_tools
WHERE teamspace_id IS NULL;

ALTER TABLE agent_definition_script_tools
  ALTER COLUMN teamspace_id SET NOT NULL;

ALTER TABLE agent_definition_script_tools
  ADD CONSTRAINT agent_definition_script_tools_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;

ALTER TABLE agent_definition_script_tools
  ADD CONSTRAINT agent_definition_script_tools_definition_fkey
  FOREIGN KEY (teamspace_id, agent_definition_id)
  REFERENCES agent_definitions(teamspace_id, id) ON DELETE CASCADE;

ALTER TABLE schedules
  ADD CONSTRAINT schedules_agent_definition_fkey
  FOREIGN KEY (teamspace_id, agent_definition_id)
  REFERENCES agent_definitions(teamspace_id, id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_agent_definition_fkey
  FOREIGN KEY (teamspace_id, agent_definition_id)
  REFERENCES agent_definitions(teamspace_id, id) ON DELETE SET NULL;

ALTER TABLE agent_runs
  ADD CONSTRAINT agent_runs_agent_definition_fkey
  FOREIGN KEY (teamspace_id, agent_definition_id)
  REFERENCES agent_definitions(teamspace_id, id) ON DELETE SET NULL;
