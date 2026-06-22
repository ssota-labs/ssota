-- Pages — Notion-style page tree. A page is NOT 1:1 with a node or workflow: it
-- is a JSON-render dashboard (places catalog React components) that loads data
-- from nodes/edges via `bindings`. Hierarchy lives in `parent_id` (a recursive
-- self-referential tree); addressing is flat by `id` (no level encoded in the
-- route, no scope enum). `subject_node_id` optionally anchors the page's bindings
-- to a specific node (e.g. an initiative) — the generic replacement for the old
-- scope / `{$ctx:initiativeId}` special-casing. Replaces the previous model where
-- pages were graph nodes (catalogKey="page") with the definition in node.properties.

CREATE TABLE IF NOT EXISTS "pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "account_id" uuid,
  "parent_id" uuid REFERENCES "pages"("id") ON DELETE CASCADE,
  "position" integer NOT NULL DEFAULT 0,
  "title" text NOT NULL,
  "icon" text,
  "slug" text,
  "spec" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "bindings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "actions" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "subject_node_id" uuid REFERENCES "nodes"("id") ON DELETE SET NULL,
  "lifecycle_status" text NOT NULL DEFAULT 'Active',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pages_project_parent_id_idx"
  ON "pages" ("project_id", "parent_id");
CREATE INDEX IF NOT EXISTS "pages_project_id_idx"
  ON "pages" ("project_id");
CREATE INDEX IF NOT EXISTS "pages_project_subject_node_id_idx"
  ON "pages" ("project_id", "subject_node_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pages_project_slug_unique"
  ON "pages" ("project_id", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "pages";
CREATE POLICY deny_all ON "pages"
  FOR ALL TO public USING (false) WITH CHECK (false);
