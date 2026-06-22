ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS app_enabled boolean NOT NULL DEFAULT false;
