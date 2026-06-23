-- agent.main router removed. The main agent's system prompt is now static
-- (code-owned) and routing is driven by per-workflow `description` manifests
-- loaded on demand. The main-instruction pointer columns are no longer used,
-- and the reserved `agent.main` workflow instruction is dropped.

ALTER TABLE "projects"
  DROP CONSTRAINT IF EXISTS "projects_main_workflow_instruction_id_fkey";
ALTER TABLE "projects"
  DROP COLUMN IF EXISTS "main_workflow_instruction_id";

ALTER TABLE "accounts"
  DROP CONSTRAINT IF EXISTS "accounts_main_workflow_instruction_id_fkey";
ALTER TABLE "accounts"
  DROP COLUMN IF EXISTS "main_workflow_instruction_id";

-- Remove the now-orphaned reserved router instruction.
DELETE FROM "workflow_instructions" WHERE "key" = 'agent.main';
