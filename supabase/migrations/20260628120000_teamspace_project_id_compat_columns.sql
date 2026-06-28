-- Backward-compat column shim for app builds that still read/write project_id
-- after 20260628000000 renamed the column to teamspace_id on multiple tables.
-- Keeps project_id in sync with teamspace_id via BEFORE INSERT/UPDATE trigger.
-- Safe to drop once all deployed app versions use teamspace_id only.

CREATE OR REPLACE FUNCTION ssota_sync_project_id_from_teamspace_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL
    AND (NEW.teamspace_id IS NULL OR NEW.teamspace_id IS DISTINCT FROM NEW.project_id)
  THEN
    NEW.teamspace_id := NEW.project_id;
  END IF;

  NEW.project_id := NEW.teamspace_id;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'nodes',
    'edges',
    'pages',
    'tasks',
    'accounts',
    'account_connections',
    'chat_workspaces',
    'workflow_instructions',
    'schedules',
    'chat_threads',
    'page_view_states',
    'agent_runs'
  ];
  trigger_name text;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'teamspace_id'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS project_id uuid',
      tbl
    );

    EXECUTE format(
      'UPDATE %I SET project_id = teamspace_id WHERE project_id IS NULL',
      tbl
    );

    trigger_name := tbl || '_project_id_compat';

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, tbl);

    EXECUTE format(
      'CREATE TRIGGER %I
         BEFORE INSERT OR UPDATE ON %I
         FOR EACH ROW
         EXECUTE FUNCTION ssota_sync_project_id_from_teamspace_id()',
      trigger_name,
      tbl
    );

    IF tbl = 'schedules' THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS schedules_project_id_idx ON schedules (project_id)';
    END IF;
  END LOOP;
END;
$$;
