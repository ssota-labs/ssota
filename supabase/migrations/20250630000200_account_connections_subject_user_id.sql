-- Vercel Connect user-subject connectors (Custom OAuth / Notion) mint tokens per
-- end-user id. Persist the Supabase user who completed authorize so callback and
-- agent getToken use the same subject as startAuthorization.

ALTER TABLE "account_connections"
  ADD COLUMN IF NOT EXISTS "subject_user_id" text;
