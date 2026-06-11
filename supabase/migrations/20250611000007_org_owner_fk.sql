-- Personal org ownership: organization.owner_user_id -> profiles.id (reverse of profiles.personal_organization_id)

-- Backfill owner from legacy profile pointer where missing
UPDATE "organizations" AS o
SET "owner_user_id" = p."id"
FROM "profiles" AS p
WHERE p."personal_organization_id" = o."id"
  AND o."owner_user_id" IS NULL;

-- Clear owner references that do not resolve to a profile
UPDATE "organizations"
SET "owner_user_id" = NULL
WHERE "owner_user_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "profiles" AS p WHERE p."id" = "organizations"."owner_user_id"
  );

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_owner_user_id_profiles_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "profiles"("id");

ALTER TABLE "profiles" DROP COLUMN IF EXISTS "personal_organization_id";
