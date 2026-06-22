-- Public bucket for in-app chat image attachments. Files are uploaded by the
-- authenticated user (via `/api/chat/upload`, anon key + user session — subject
-- to RLS) and served by public URL so the agent / AI Gateway can fetch them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- storage.objects has RLS enabled by Supabase. Public read is served through the
-- public object endpoint, so we only need to allow authenticated writes scoped
-- to this bucket (uploads happen with the user's session, not the service role).
drop policy if exists "chat_attachments_authenticated_insert" on storage.objects;
create policy "chat_attachments_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'chat-attachments');

drop policy if exists "chat_attachments_authenticated_update" on storage.objects;
create policy "chat_attachments_authenticated_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'chat-attachments')
  with check (bucket_id = 'chat-attachments');

drop policy if exists "chat_attachments_authenticated_delete" on storage.objects;
create policy "chat_attachments_authenticated_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'chat-attachments');
