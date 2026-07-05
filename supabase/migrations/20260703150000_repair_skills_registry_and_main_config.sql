-- Repair: schema_migrations may list 20260630170000 / 20260703120000 while DDL never
-- landed (branching partial apply, manual rollback, etc.). Idempotent — safe on fresh DBs too.

-- ---------------------------------------------------------------------------
-- Runtime skills registry (20260630170000)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_source') THEN
    CREATE TYPE skill_source AS ENUM ('builtin', 'skills_sh', 'custom');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'skill_source'
      AND e.enumlabel = 'skills_sh'
  ) THEN
    ALTER TYPE skill_source ADD VALUE 'skills_sh';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  source skill_source NOT NULL DEFAULT 'custom',
  external_id text,
  content_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS skills_organization_key_unique
  ON skills (organization_id, key)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS skills_platform_key_unique
  ON skills (key)
  WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS skills_organization_id_idx ON skills (organization_id);

CREATE TABLE IF NOT EXISTS skill_snapshots (
  skill_id uuid PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_definition_skills (
  teamspace_id uuid NOT NULL REFERENCES teamspaces(id) ON DELETE CASCADE,
  agent_definition_id uuid NOT NULL,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_definition_skills_definition_fkey'
  ) THEN
    ALTER TABLE agent_definition_skills
      ADD CONSTRAINT agent_definition_skills_definition_fkey
      FOREIGN KEY (teamspace_id, agent_definition_id)
      REFERENCES agent_definitions (teamspace_id, id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS agent_definition_skills_pk
  ON agent_definition_skills (agent_definition_id, skill_id);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_definition_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_skills ON skills;
CREATE POLICY deny_all_skills ON skills FOR ALL USING (false);

DROP POLICY IF EXISTS deny_all_skill_snapshots ON skill_snapshots;
CREATE POLICY deny_all_skill_snapshots ON skill_snapshots FOR ALL USING (false);

DROP POLICY IF EXISTS deny_all_agent_definition_skills ON agent_definition_skills;
CREATE POLICY deny_all_agent_definition_skills ON agent_definition_skills FOR ALL USING (false);

-- ---------------------------------------------------------------------------
-- Teamspace main agent config (20260703120000)
-- ---------------------------------------------------------------------------

ALTER TABLE teamspaces
  ADD COLUMN IF NOT EXISTS main_instructions jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS main_tool_bundles jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS main_run_policy jsonb NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_definitions'
      AND column_name = 'is_main'
  ) THEN
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
  END IF;
END $$;

ALTER TABLE agent_definitions
  DROP COLUMN IF EXISTS is_main,
  DROP COLUMN IF EXISTS reference_only;

-- ---------------------------------------------------------------------------
-- Schedules main orchestrator FK (20260703130000)
-- ---------------------------------------------------------------------------

ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_agent_definition_fkey;
