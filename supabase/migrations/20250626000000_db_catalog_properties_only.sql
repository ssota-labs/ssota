-- DB catalog (L1) + properties-only nodes/edges.
-- Catalog rows are seeded by pnpm db:seed (seedDevWorkflowCatalog).

CREATE TABLE IF NOT EXISTS "node_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "property_schema" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "node_catalog_project_key_unique"
  ON "node_catalog" ("project_id", "key");

CREATE INDEX IF NOT EXISTS "node_catalog_project_id_idx"
  ON "node_catalog" ("project_id");

CREATE TABLE IF NOT EXISTS "edge_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "domain_catalog_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[],
  "range_catalog_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[],
  "property_schema" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "edge_catalog_project_key_unique"
  ON "edge_catalog" ("project_id", "key");

CREATE INDEX IF NOT EXISTS "edge_catalog_project_id_idx"
  ON "edge_catalog" ("project_id");

ALTER TABLE "node_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "node_catalog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "node_catalog";
CREATE POLICY deny_all ON "node_catalog"
  FOR ALL TO public USING (false) WITH CHECK (false);

ALTER TABLE "edge_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "edge_catalog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON "edge_catalog";
CREATE POLICY deny_all ON "edge_catalog"
  FOR ALL TO public USING (false) WITH CHECK (false);

-- Add FK columns (nullable during backfill)
ALTER TABLE "nodes" ADD COLUMN IF NOT EXISTS "node_catalog_id" uuid REFERENCES "node_catalog"("id");
ALTER TABLE "edges" ADD COLUMN IF NOT EXISTS "edge_catalog_id" uuid REFERENCES "edge_catalog"("id");

-- Backfill properties from legacy columns when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'nodes' AND column_name = 'content'
  ) THEN
    UPDATE "nodes"
    SET "properties" = "properties"
      || CASE
        WHEN "content" IS NOT NULL AND "content" <> ''
        THEN jsonb_build_object('content', to_jsonb("content"))
        ELSE '{}'::jsonb
      END
      || CASE
        WHEN "lifecycle_status" IS NOT NULL
        THEN jsonb_build_object('lifecycleStatus', "lifecycle_status"::text)
        ELSE '{}'::jsonb
      END
    WHERE "content" IS NOT NULL OR "lifecycle_status" IS NOT NULL;
  END IF;
END $$;

-- Backfill node_catalog_id from node_type when catalog exists
UPDATE "nodes" n
SET "node_catalog_id" = nc.id
FROM "node_catalog" nc
WHERE n."node_catalog_id" IS NULL
  AND n."project_id" = nc."project_id"
  AND nc."key" = n."node_type"
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'nodes' AND column_name = 'node_type'
  );

-- Backfill edge_catalog_id from edge_type when catalog exists
UPDATE "edges" e
SET "edge_catalog_id" = ec.id
FROM "edge_catalog" ec
WHERE e."edge_catalog_id" IS NULL
  AND e."project_id" = ec."project_id"
  AND ec."key" = e."edge_type"
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'edges' AND column_name = 'edge_type'
  );

-- Drop legacy indexes/columns on nodes
DROP INDEX IF EXISTS "nodes_project_node_type_idx";
DROP INDEX IF EXISTS "nodes_project_lifecycle_status_idx";

ALTER TABLE "nodes" DROP COLUMN IF EXISTS "node_type";
ALTER TABLE "nodes" DROP COLUMN IF EXISTS "content";
ALTER TABLE "nodes" DROP COLUMN IF EXISTS "lifecycle_status";

-- Drop legacy edge_type column
ALTER TABLE "edges" DROP COLUMN IF EXISTS "edge_type";

-- Drop lifecycle enum if unused
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'lifecycle_status'
  ) THEN
    DROP TYPE IF EXISTS "lifecycle_status";
  END IF;
END $$;

-- NOT NULL + indexes (only when all rows have FK — seed runs before graph instances on fresh DB)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "nodes" WHERE "node_catalog_id" IS NULL) THEN
    ALTER TABLE "nodes" ALTER COLUMN "node_catalog_id" SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "edges" WHERE "edge_catalog_id" IS NULL) THEN
    ALTER TABLE "edges" ALTER COLUMN "edge_catalog_id" SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "nodes_project_node_catalog_id_idx"
  ON "nodes" ("project_id", "node_catalog_id");

CREATE INDEX IF NOT EXISTS "nodes_project_lifecycle_status_idx"
  ON "nodes" ((properties->>'lifecycleStatus'));

CREATE INDEX IF NOT EXISTS "edges_project_edge_catalog_id_idx"
  ON "edges" ("project_id", "edge_catalog_id");
