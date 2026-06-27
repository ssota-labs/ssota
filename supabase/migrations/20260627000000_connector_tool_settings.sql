-- Per-(org, user, toolkit) connector tool restrictions. Disabled tool slugs are
-- excluded from the Composio Tool Router session. Keyed by the Composio entity
-- (org + profile), shared across that org's projects.
create table if not exists connector_tool_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  toolkit text not null,
  disabled_tools jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists connector_tool_settings_org_profile_toolkit_unique
  on connector_tool_settings (org_id, profile_id, toolkit);
