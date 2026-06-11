-- Project-scoped catalog and graph data (one schema space per SSOTA project / agent)

INSERT INTO "organizations" ("slug", "name")
VALUES ('ssota-labs', 'SSOTA Labs')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "projects" ("organization_id", "slug", "name")
SELECT o.id, 'ssota-dev', 'SSOTA Dev'
FROM "organizations" o
WHERE o.slug = 'ssota-labs'
ON CONFLICT DO NOTHING;

-- Default project for backfill (ssota-dev under ssota-labs, else first project)
CREATE TEMP TABLE _default_project AS
SELECT p.id AS project_id
FROM "projects" p
JOIN "organizations" o ON o.id = p.organization_id
WHERE o.slug = 'ssota-labs' AND p.slug = 'ssota-dev'
LIMIT 1;

INSERT INTO _default_project (project_id)
SELECT id FROM "projects"
WHERE NOT EXISTS (SELECT 1 FROM _default_project)
LIMIT 1;

-- Add nullable project_id columns
ALTER TABLE "node_catalog" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "edge_catalog" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "property_catalog" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "action_catalog" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "instructions" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "nodes" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "edges" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "action_log" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "gates" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");
ALTER TABLE "action_property_permissions" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id");

UPDATE "node_catalog" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "edge_catalog" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "property_catalog" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "action_catalog" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "instructions" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "nodes" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "edges" e SET "project_id" = n."project_id"
FROM "nodes" n
WHERE e."source_node_id" = n."id" AND e."project_id" IS NULL;
UPDATE "edges" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "action_log" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "gates" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;
UPDATE "action_property_permissions" SET "project_id" = (SELECT project_id FROM _default_project LIMIT 1) WHERE "project_id" IS NULL;

-- Drop FKs referencing old single-column catalog PKs
ALTER TABLE "nodes" DROP CONSTRAINT IF EXISTS "nodes_node_type_node_catalog_node_type_fk";
ALTER TABLE "edges" DROP CONSTRAINT IF EXISTS "edges_edge_type_edge_catalog_edge_type_fk";
ALTER TABLE "action_property_permissions" DROP CONSTRAINT IF EXISTS "action_property_permissions_action_type_action_catalog_action_type_fk";
ALTER TABLE "action_property_permissions" DROP CONSTRAINT IF EXISTS "action_property_permissions_node_type_node_catalog_node_type_fk";

-- Drop old PKs and slug uniques
ALTER TABLE "node_catalog" DROP CONSTRAINT IF EXISTS "node_catalog_pkey";
DROP INDEX IF EXISTS "node_catalog_slug_unique";
ALTER TABLE "edge_catalog" DROP CONSTRAINT IF EXISTS "edge_catalog_pkey";
DROP INDEX IF EXISTS "edge_catalog_slug_unique";
ALTER TABLE "property_catalog" DROP CONSTRAINT IF EXISTS "property_catalog_pkey";
ALTER TABLE "action_catalog" DROP CONSTRAINT IF EXISTS "action_catalog_pkey";
DROP INDEX IF EXISTS "action_catalog_slug_unique";
DROP INDEX IF EXISTS "instructions_slug_unique";

ALTER TABLE "node_catalog" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "edge_catalog" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "property_catalog" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "action_catalog" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "instructions" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "nodes" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "edges" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "action_log" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "gates" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "action_property_permissions" ALTER COLUMN "project_id" SET NOT NULL;

ALTER TABLE "node_catalog" ADD PRIMARY KEY ("project_id", "node_type");
CREATE UNIQUE INDEX "node_catalog_project_slug_unique" ON "node_catalog" ("project_id", "slug");

ALTER TABLE "edge_catalog" ADD PRIMARY KEY ("project_id", "edge_type");
CREATE UNIQUE INDEX "edge_catalog_project_slug_unique" ON "edge_catalog" ("project_id", "slug");

ALTER TABLE "property_catalog" ADD PRIMARY KEY ("project_id", "property_key");

ALTER TABLE "action_catalog" ADD PRIMARY KEY ("project_id", "action_type");
CREATE UNIQUE INDEX "action_catalog_project_slug_unique" ON "action_catalog" ("project_id", "slug");

CREATE UNIQUE INDEX "instructions_project_slug_unique" ON "instructions" ("project_id", "slug");

ALTER TABLE "nodes"
  ADD CONSTRAINT "nodes_project_node_type_fkey"
  FOREIGN KEY ("project_id", "node_type")
  REFERENCES "node_catalog" ("project_id", "node_type");

ALTER TABLE "edges"
  ADD CONSTRAINT "edges_project_edge_type_fkey"
  FOREIGN KEY ("project_id", "edge_type")
  REFERENCES "edge_catalog" ("project_id", "edge_type");

ALTER TABLE "action_property_permissions"
  ADD CONSTRAINT "action_property_permissions_project_action_fkey"
  FOREIGN KEY ("project_id", "action_type")
  REFERENCES "action_catalog" ("project_id", "action_type");

ALTER TABLE "action_property_permissions"
  ADD CONSTRAINT "action_property_permissions_project_node_type_fkey"
  FOREIGN KEY ("project_id", "node_type")
  REFERENCES "node_catalog" ("project_id", "node_type");

CREATE INDEX IF NOT EXISTS "nodes_project_node_type_idx"
  ON "nodes" ("project_id", "node_type");

CREATE INDEX IF NOT EXISTS "nodes_project_subject_id_idx"
  ON "nodes" ("project_id", "node_type", ((properties->>'subject_id')));

CREATE INDEX IF NOT EXISTS "edges_project_id_idx" ON "edges" ("project_id");
CREATE INDEX IF NOT EXISTS "action_log_project_id_idx" ON "action_log" ("project_id");
CREATE INDEX IF NOT EXISTS "gates_project_id_idx" ON "gates" ("project_id");

DROP TABLE IF EXISTS _default_project;
