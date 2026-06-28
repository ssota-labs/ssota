-- Public beta waitlist signups from the marketing landing page.

CREATE TABLE IF NOT EXISTS "beta_signups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "source" text NOT NULL DEFAULT 'landing',
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "beta_signups_email_unique"
  ON "beta_signups" ("email");
CREATE INDEX IF NOT EXISTS "beta_signups_status_idx"
  ON "beta_signups" ("status");

ALTER TABLE "beta_signups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "beta_signups" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "beta_signups";
CREATE POLICY deny_all ON "beta_signups"
  FOR ALL TO public USING (false) WITH CHECK (false);
