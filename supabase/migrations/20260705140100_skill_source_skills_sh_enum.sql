-- Repair skill_source enum when an older partial apply created builtin/custom only.

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
