-- Self-host compatibility shim.
--
-- The SQL migrations under supabase/migrations were authored for Supabase and
-- reference its `auth` schema (auth.users, auth.uid()) and Row Level Security.
-- On plain Postgres those objects don't exist, so this shim creates a minimal
-- equivalent that lets every migration apply. The app connects as the database
-- owner, which bypasses RLS, so the policies only need to be creatable — they
-- are not relied on for enforcement in single-user self-host mode.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- Mirror Supabase's auth.uid(): read the current request's JWT subject claim.
-- Returns null when unset (the app's admin connection bypasses RLS regardless).
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Seed the default local single-user identity so foreign keys to auth.users
-- resolve. Matches LOCAL_AUTH_USER_ID / LOCAL_AUTH_USER_EMAIL defaults.
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'dev@localhost')
on conflict (id) do nothing;

-- Supabase roles referenced by RLS policies (e.g. `... to anon, authenticated`).
-- The app's owner connection bypasses RLS; these only need to exist so the
-- policy-creating migrations apply.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- Minimal Supabase Storage schema. Self-host serves studio/editor/chat files
-- from local or S3 storage, so these tables exist only so the bucket-setup and
-- bucket-scoped RLS migrations apply on plain Postgres.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
