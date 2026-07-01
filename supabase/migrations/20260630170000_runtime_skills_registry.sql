-- Runtime skills registry: org catalog, snapshots, agent bindings

CREATE TYPE skill_source AS ENUM ('builtin', 'skills_sh', 'custom');

CREATE TABLE skills (
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

CREATE UNIQUE INDEX skills_organization_key_unique
  ON skills (organization_id, key)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX skills_platform_key_unique
  ON skills (key)
  WHERE organization_id IS NULL;

CREATE INDEX skills_organization_id_idx ON skills (organization_id);

CREATE TABLE skill_snapshots (
  skill_id uuid PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_definition_skills (
  teamspace_id uuid NOT NULL REFERENCES teamspaces(id) ON DELETE CASCADE,
  agent_definition_id uuid NOT NULL,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT agent_definition_skills_definition_fkey
    FOREIGN KEY (teamspace_id, agent_definition_id)
    REFERENCES agent_definitions (teamspace_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX agent_definition_skills_pk
  ON agent_definition_skills (agent_definition_id, skill_id);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_definition_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY deny_all_skills ON skills FOR ALL USING (false);
CREATE POLICY deny_all_skill_snapshots ON skill_snapshots FOR ALL USING (false);
CREATE POLICY deny_all_agent_definition_skills ON agent_definition_skills FOR ALL USING (false);
