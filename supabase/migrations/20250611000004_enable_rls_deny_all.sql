-- LoopOS graph tables: RLS on, deny-all policies.
-- PostgREST (anon/authenticated) cannot read or write rows.
-- Server adapter uses DATABASE_URL (postgres superuser / service role) which bypasses RLS.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organizations',
    'projects',
    'organization_memberships',
    'user_project_preferences',
    'archetypes',
    'node_catalog',
    'nodes',
    'edge_catalog',
    'edges',
    'property_catalog',
    'action_catalog',
    'action_property_permissions',
    'instructions',
    'action_log',
    'gates'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS deny_all ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY deny_all ON public.%I FOR ALL TO public USING (false) WITH CHECK (false)',
      table_name
    );
  END LOOP;
END $$;
