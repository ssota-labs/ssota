-- Console onboarding: profiles + personal org ownership

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "display_name" text,
  "personal_organization_id" uuid REFERENCES "organizations"("id"),
  "onboarding_step" text DEFAULT 'profile' NOT NULL,
  "onboarding_completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "owner_user_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_owner_user_id_unique"
  ON "organizations" ("owner_user_id")
  WHERE "owner_user_id" IS NOT NULL;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all ON public.profiles;
CREATE POLICY deny_all ON public.profiles FOR ALL TO public USING (false) WITH CHECK (false);
