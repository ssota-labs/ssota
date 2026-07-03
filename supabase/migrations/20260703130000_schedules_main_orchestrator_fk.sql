-- Main orchestrator is teamspace config, not an agent_definitions row.
-- main_heartbeat schedules keep MAIN_AGENT_ID as a logical reference only.

ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_agent_definition_fkey;
