-- Per-connection connector tool restrictions (was per-toolkit).
-- connection_id is the Composio connected-account id. Legacy rows keep
-- connection_id NULL until migrated in application code.

alter table connector_tool_settings
  add column if not exists connection_id text;

drop index if exists connector_tool_settings_org_profile_toolkit_unique;

create unique index if not exists connector_tool_settings_org_profile_connection_unique
  on connector_tool_settings (org_id, profile_id, connection_id)
  where connection_id is not null;

create unique index if not exists connector_tool_settings_legacy_toolkit_unique
  on connector_tool_settings (org_id, profile_id, toolkit)
  where connection_id is null;
