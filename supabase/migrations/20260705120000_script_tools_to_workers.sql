-- Rename script_tools → workers; add kind + kind_config; migrate tool rows.
-- Idempotent: safe when workers already exists or script_tools was already renamed.

DO $$
BEGIN
  IF to_regclass('public.workers') IS NOT NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.script_tools') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE script_tools RENAME TO workers;

  ALTER INDEX IF EXISTS script_tools_teamspace_key_unique
    RENAME TO workers_teamspace_key_unique;
  ALTER INDEX IF EXISTS script_tools_teamspace_account_key_unique
    RENAME TO workers_teamspace_account_key_unique;
  ALTER INDEX IF EXISTS script_tools_teamspace_id_idx
    RENAME TO workers_teamspace_id_idx;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workers' AND column_name = 'kind'
  ) THEN
    ALTER TABLE workers
      ADD COLUMN kind text NOT NULL DEFAULT 'tool',
      ADD COLUMN kind_config jsonb NOT NULL DEFAULT '{}'::jsonb;

    UPDATE workers
    SET
      kind = 'tool',
      kind_config = jsonb_build_object(
        'permissions', COALESCE(permissions, '{}'::jsonb),
        'defaultConfig', COALESCE(default_config, '{}'::jsonb)
      );

    ALTER TABLE workers
      DROP COLUMN IF EXISTS permissions,
      DROP COLUMN IF EXISTS default_config;
  END IF;

  IF to_regclass('public.agent_definition_script_tools') IS NOT NULL
     AND to_regclass('public.agent_definition_workers') IS NULL THEN
    ALTER TABLE agent_definition_script_tools RENAME TO agent_definition_workers;

    ALTER TABLE agent_definition_workers
      RENAME COLUMN script_tool_id TO worker_id;

    ALTER INDEX IF EXISTS agent_definition_script_tools_pk
      RENAME TO agent_definition_workers_pk;

    ALTER TABLE agent_definition_workers
      DROP CONSTRAINT IF EXISTS agent_definition_script_tools_script_tool_id_fkey;

    ALTER TABLE agent_definition_workers
      DROP CONSTRAINT IF EXISTS agent_definition_workers_worker_id_fkey;

    ALTER TABLE agent_definition_workers
      ADD CONSTRAINT agent_definition_workers_worker_id_fkey
      FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'workers' AND policyname = 'deny_all_script_tools'
    ) THEN
      ALTER POLICY deny_all_script_tools ON workers RENAME TO deny_all_workers;
    END IF;

    DROP POLICY IF EXISTS deny_all_agent_definition_script_tools ON agent_definition_workers;
    CREATE POLICY deny_all_agent_definition_workers
      ON agent_definition_workers FOR ALL USING (false);
  END IF;
END $$;

ALTER TYPE agent_runtime_kind ADD VALUE IF NOT EXISTS 'worker';
