-- Node-type drill-in templates: a page whose `applies_to_node_type` is set (e.g.
-- "initiative") renders only when drilling into a node of that catalogKey, with
-- that node injected as the binding `subject`. Null = project-level (L0) page.
-- This generalizes the per-initiative factory routes into reusable templates.

ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "applies_to_node_type" text;

CREATE INDEX IF NOT EXISTS "pages_project_applies_to_node_type_idx"
  ON "pages" ("project_id", "applies_to_node_type");
