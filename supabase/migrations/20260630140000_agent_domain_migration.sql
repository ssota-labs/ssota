-- Agent domain migration: workflow_instructions → agent_definitions (breaking)

CREATE TYPE agent_kind AS ENUM ('main', 'specialist', 'worker', 'guide');
CREATE TYPE agent_trigger AS ENUM (
  'chat',
  'chatbot',
  'task',
  'schedule',
  'heartbeat',
  'manual',
  'gate_resume'
);
CREATE TYPE schedule_target_type AS ENUM (
  'main_heartbeat',
  'specialist_agent',
  'ready_task_dispatch'
);

-- Rename workflow_instructions → agent_definitions
ALTER TABLE workflow_instructions RENAME TO agent_definitions;
ALTER TABLE agent_definitions RENAME COLUMN content TO instructions;

ALTER TABLE agent_definitions
  ADD COLUMN agent_kind agent_kind NOT NULL DEFAULT 'specialist',
  ADD COLUMN tool_bundles jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN node_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN run_policy jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Rename indexes
ALTER INDEX IF EXISTS workflow_instructions_project_key_unique
  RENAME TO agent_definitions_teamspace_key_unique;
ALTER INDEX IF EXISTS workflow_instructions_project_account_key_unique
  RENAME TO agent_definitions_teamspace_account_key_unique;
ALTER INDEX IF EXISTS workflow_instructions_project_id_idx
  RENAME TO agent_definitions_teamspace_id_idx;

-- Clear legacy workflow rows (breaking migration — no active users)
DELETE FROM agent_definitions;

-- tasks: rename FK and add denormalized agent_key
ALTER TABLE tasks RENAME COLUMN workflow_instruction_id TO agent_definition_id;
ALTER TABLE tasks ADD COLUMN agent_key text;

ALTER INDEX IF EXISTS tasks_project_workflow_instruction_id_idx
  RENAME TO tasks_teamspace_agent_definition_id_idx;

-- schedules: rename FK and add target_type
ALTER TABLE schedules RENAME COLUMN workflow_instruction_id TO agent_definition_id;
ALTER TABLE schedules
  ADD COLUMN target_type schedule_target_type NOT NULL DEFAULT 'specialist_agent';

-- script_tools
CREATE TABLE script_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES teamspaces(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_schema jsonb,
  script text NOT NULL,
  runtime text NOT NULL DEFAULT 'vercel_sandbox',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX script_tools_teamspace_key_unique
  ON script_tools (teamspace_id, key)
  WHERE account_id IS NULL;

CREATE UNIQUE INDEX script_tools_teamspace_account_key_unique
  ON script_tools (teamspace_id, account_id, key)
  WHERE account_id IS NOT NULL;

CREATE INDEX script_tools_teamspace_id_idx ON script_tools (teamspace_id);

-- agent_definition_script_tools join
CREATE TABLE agent_definition_script_tools (
  agent_definition_id uuid NOT NULL REFERENCES agent_definitions(id) ON DELETE CASCADE,
  script_tool_id uuid NOT NULL REFERENCES script_tools(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (agent_definition_id, script_tool_id)
);

-- agent_runs: agent-centric telemetry
ALTER TABLE agent_runs
  ADD COLUMN agent_definition_id uuid REFERENCES agent_definitions(id) ON DELETE SET NULL,
  ADD COLUMN agent_key text,
  ADD COLUMN agent_kind agent_kind,
  ADD COLUMN trigger agent_trigger;

CREATE INDEX agent_runs_agent_definition_id_idx ON agent_runs (agent_definition_id);

-- RLS deny-all (match existing pattern)
ALTER TABLE script_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_definition_script_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY deny_all_script_tools ON script_tools FOR ALL USING (false);
CREATE POLICY deny_all_agent_definition_script_tools
  ON agent_definition_script_tools FOR ALL USING (false);
