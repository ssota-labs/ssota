-- Rename legacy tool bundle id `script_tools` → `workers` in stored JSON arrays.

UPDATE agent_definitions
SET tool_bundles = replace(tool_bundles::text, '"script_tools"', '"workers"')::jsonb
WHERE tool_bundles::text LIKE '%"script_tools"%';

UPDATE teamspaces
SET main_tool_bundles = replace(main_tool_bundles::text, '"script_tools"', '"workers"')::jsonb
WHERE main_tool_bundles IS NOT NULL
  AND main_tool_bundles::text LIKE '%"script_tools"%';
