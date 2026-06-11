-- Console user ids: align with auth.users (uuid) instead of text

ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_owner_user_id_profiles_id_fk";

ALTER TABLE "profiles" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;

ALTER TABLE "organizations" ALTER COLUMN "owner_user_id" TYPE uuid USING "owner_user_id"::uuid;

ALTER TABLE "organization_memberships" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "user_project_preferences" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_id_auth_users_id_fk"
  FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE;

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_owner_user_id_profiles_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "profiles"("id");

ALTER TABLE "organization_memberships"
  ADD CONSTRAINT "organization_memberships_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "user_project_preferences"
  ADD CONSTRAINT "user_project_preferences_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
