-- Operational impact queue for agent loop work spawned from action_log changes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'impact_queue_status'
  ) THEN
    CREATE TYPE "public"."impact_queue_status" AS ENUM(
      'pending',
      'running',
      'succeeded',
      'failed',
      'dead',
      'skipped'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "impact_queue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "source_action_log_id" uuid NOT NULL REFERENCES "action_log"("id"),
  "source_node_id" uuid REFERENCES "nodes"("id"),
  "target_node_id" uuid REFERENCES "nodes"("id"),
  "dependency_edge_id" uuid REFERENCES "edges"("id"),
  "workflow_key" text NOT NULL,
  "instruction_id" uuid REFERENCES "instructions"("id"),
  "status" "impact_queue_status" DEFAULT 'pending' NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "run_at" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_by" text,
  "locked_until" timestamp with time zone,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "idempotency_key" text NOT NULL,
  "last_error" text,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "result" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "impact_queue_project_idempotency_unique"
  ON "impact_queue" ("project_id", "idempotency_key");

CREATE INDEX IF NOT EXISTS "impact_queue_claim_idx"
  ON "impact_queue" (
    "project_id",
    "status",
    "run_at",
    "priority" DESC,
    "created_at"
  )
  WHERE "status" IN ('pending', 'failed', 'running');

CREATE INDEX IF NOT EXISTS "impact_queue_project_source_log_idx"
  ON "impact_queue" ("project_id", "source_action_log_id");

CREATE INDEX IF NOT EXISTS "impact_queue_project_target_node_idx"
  ON "impact_queue" ("project_id", "target_node_id");

ALTER TABLE "impact_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impact_queue" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all ON "impact_queue";
CREATE POLICY deny_all ON "impact_queue"
  FOR ALL TO public
  USING (false)
  WITH CHECK (false);
