-- Main agent config lives on teamspaces; agent_definitions holds runnable playbooks only.

ALTER TABLE teamspaces
  ADD COLUMN IF NOT EXISTS main_instructions jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS main_tool_bundles jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS main_run_policy jsonb NOT NULL DEFAULT '{}';

UPDATE teamspaces t
SET
  main_instructions = ad.instructions,
  main_tool_bundles = ad.tool_bundles,
  main_run_policy = ad.run_policy
FROM agent_definitions ad
WHERE ad.teamspace_id = t.id
  AND ad.is_main = true
  AND ad.account_id IS NULL;

DELETE FROM agent_definitions
WHERE is_main = true OR reference_only = true;

ALTER TABLE agent_definitions
  DROP COLUMN IF EXISTS is_main,
  DROP COLUMN IF EXISTS reference_only;
