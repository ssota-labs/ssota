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
