-- Studio build artifacts bucket (private; server-side access only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-builds',
  'studio-builds',
  false,
  52428800,
  array['text/javascript', 'application/javascript', 'text/css', 'application/json']
)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists "studio_builds_deny_all_select" on storage.objects;
create policy "studio_builds_deny_all_select"
  on storage.objects
  for select
  using (false);

drop policy if exists "studio_builds_deny_all_insert" on storage.objects;
create policy "studio_builds_deny_all_insert"
  on storage.objects
  for insert
  with check (false);

drop policy if exists "studio_builds_deny_all_update" on storage.objects;
create policy "studio_builds_deny_all_update"
  on storage.objects
  for update
  using (false);

drop policy if exists "studio_builds_deny_all_delete" on storage.objects;
create policy "studio_builds_deny_all_delete"
  on storage.objects
  for delete
  using (false);
