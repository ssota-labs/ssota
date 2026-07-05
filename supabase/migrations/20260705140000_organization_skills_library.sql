-- Org skill library membership (Explore → save, My library tab)

CREATE TABLE IF NOT EXISTS organization_skills (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, skill_id)
);

CREATE INDEX IF NOT EXISTS organization_skills_skill_id_idx
  ON organization_skills (skill_id);

-- Backfill: org-owned skills are already in the library
INSERT INTO organization_skills (organization_id, skill_id)
SELECT organization_id, id
FROM skills
WHERE organization_id IS NOT NULL
ON CONFLICT DO NOTHING;
