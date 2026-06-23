-- Per-user, per-table-element view state for the advanced data table: column
-- order / visibility / sizing / pinning, sorting, filters, and pagination. Keyed
-- by (user, page, element) so each user customizes their own view of a table on
-- a page independently. The table component is controlled; this is the swappable
-- persistence backend behind it.

CREATE TABLE IF NOT EXISTS "page_view_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "page_id" uuid NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "element_id" text NOT NULL,
  "view_state" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "page_view_states_user_page_element_unique"
  ON "page_view_states" ("user_id", "page_id", "element_id");
CREATE INDEX IF NOT EXISTS "page_view_states_page_user_idx"
  ON "page_view_states" ("page_id", "user_id");

ALTER TABLE "page_view_states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_view_states" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "page_view_states";
CREATE POLICY deny_all ON "page_view_states"
  FOR ALL TO public USING (false) WITH CHECK (false);
