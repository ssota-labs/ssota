-- Public bucket for rich-text editor images (uploaded server-side via service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editor-assets',
  'editor-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;
