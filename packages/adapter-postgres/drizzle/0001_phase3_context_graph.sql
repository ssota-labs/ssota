ALTER TABLE "node_catalog" ADD COLUMN IF NOT EXISTS "property_refs" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "node_catalog" ADD COLUMN IF NOT EXISTS "allowed_action_refs" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "action_catalog" ADD COLUMN IF NOT EXISTS "scope" jsonb DEFAULT '{"kind":"global"}'::jsonb NOT NULL;

ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "scope" jsonb DEFAULT '{"kind":"global"}'::jsonb NOT NULL;
ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "triggers" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "workflow_steps" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "allowed_actions" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "output_contract" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "gate_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "completion_criteria" text;
