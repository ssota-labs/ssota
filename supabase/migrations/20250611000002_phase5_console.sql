-- Phase 5 console: organizations, projects, catalog slugs

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "projects_org_slug_unique" ON "projects" ("organization_id", "slug");

CREATE TABLE IF NOT EXISTS "organization_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "user_id" text NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_memberships_org_user_unique" ON "organization_memberships" ("organization_id", "user_id");

CREATE TABLE IF NOT EXISTS "user_project_preferences" (
  "user_id" text PRIMARY KEY NOT NULL,
  "org_slug" text NOT NULL,
  "project_slug" text NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "node_catalog" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "node_catalog" ADD COLUMN IF NOT EXISTS "label" text;
UPDATE "node_catalog" SET "slug" = lower("node_type"), "label" = "node_type" WHERE "slug" IS NULL;
ALTER TABLE "node_catalog" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "node_catalog" ALTER COLUMN "label" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "node_catalog_slug_unique" ON "node_catalog" ("slug");

ALTER TABLE "edge_catalog" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "edge_catalog" ADD COLUMN IF NOT EXISTS "label" text;
UPDATE "edge_catalog" SET "slug" = lower("edge_type"), "label" = "edge_type" WHERE "slug" IS NULL;
ALTER TABLE "edge_catalog" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "edge_catalog" ALTER COLUMN "label" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "edge_catalog_slug_unique" ON "edge_catalog" ("slug");

ALTER TABLE "action_catalog" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "action_catalog" ADD COLUMN IF NOT EXISTS "label" text;
UPDATE "action_catalog" SET "slug" = lower("action_type"), "label" = "action_type" WHERE "slug" IS NULL;
ALTER TABLE "action_catalog" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "action_catalog" ALTER COLUMN "label" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "action_catalog_slug_unique" ON "action_catalog" ("slug");

ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "slug" text;
UPDATE "instructions" SET "slug" = regexp_replace(lower("title"), '[^a-z0-9]+', '_', 'g') WHERE "slug" IS NULL;
ALTER TABLE "instructions" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "instructions_slug_unique" ON "instructions" ("slug");
