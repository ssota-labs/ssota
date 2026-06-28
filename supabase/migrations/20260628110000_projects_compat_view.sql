-- Backward-compat read shim for app builds that still query "projects"
-- after 20260628000000 renamed the table to teamspaces.
-- Safe to drop once all deployed app versions use teamspaces / getTeamspaceBySlug.

CREATE OR REPLACE VIEW projects AS
SELECT
  id,
  organization_id,
  slug,
  name,
  app_enabled,
  created_at
FROM teamspaces;
