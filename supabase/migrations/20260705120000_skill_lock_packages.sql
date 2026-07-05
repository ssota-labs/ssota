-- Skills lock / blob packages: org inventory, content-addressed packages, agent binding locks

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_package_source_type') THEN
    CREATE TYPE skill_package_source_type AS ENUM ('platform', 'github', 'inline');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_lock_status') THEN
    CREATE TYPE skill_lock_status AS ENUM ('ready', 'pending', 'failed');
  END IF;
END $$;

-- Drop skills_sh from skill_source enum (migrate existing rows to custom)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'skill_source' AND e.enumlabel = 'skills_sh'
  ) THEN
    UPDATE skills SET source = 'custom' WHERE source::text = 'skills_sh';

    ALTER TABLE skills ALTER COLUMN source DROP DEFAULT;

    ALTER TYPE skill_source RENAME TO skill_source_old;
    CREATE TYPE skill_source AS ENUM ('builtin', 'custom');
    ALTER TABLE skills
      ALTER COLUMN source TYPE skill_source
      USING (
        CASE
          WHEN source::text = 'skills_sh' THEN 'custom'::skill_source
          ELSE source::text::skill_source
        END
      );
    ALTER TABLE skills ALTER COLUMN source SET DEFAULT 'custom'::skill_source;
    DROP TYPE skill_source_old;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS organization_skills (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, skill_id)
);

CREATE INDEX IF NOT EXISTS organization_skills_skill_id_idx
  ON organization_skills (skill_id);

CREATE TABLE IF NOT EXISTS skill_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  source_type skill_package_source_type NOT NULL,
  storage_key text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_count integer NOT NULL DEFAULT 0,
  size_bytes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS skill_packages_org_hash_unique
  ON skill_packages (organization_id, content_hash);

CREATE INDEX IF NOT EXISTS skill_packages_organization_id_idx
  ON skill_packages (organization_id);

ALTER TABLE agent_definition_skills
  ADD COLUMN IF NOT EXISTS lock jsonb,
  ADD COLUMN IF NOT EXISTS lock_status skill_lock_status,
  ADD COLUMN IF NOT EXISTS lock_error text;

ALTER TABLE organization_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_organization_skills ON organization_skills;
CREATE POLICY deny_all_organization_skills ON organization_skills FOR ALL USING (false);

DROP POLICY IF EXISTS deny_all_skill_packages ON skill_packages;
CREATE POLICY deny_all_skill_packages ON skill_packages FOR ALL USING (false);
