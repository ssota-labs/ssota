-- SSOTA initial schema (from Drizzle schema.ts)
-- Apply via: pnpm db:migrate (= supabase migration up --local)

CREATE TYPE "public"."action_outcome" AS ENUM('committed', 'gated', 'rejected');
CREATE TYPE "public"."executor_type" AS ENUM('Agent', 'Human', 'System');
CREATE TYPE "public"."gate_status" AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE "public"."lifecycle_status" AS ENUM('Draft', 'Active', 'Archived', 'Deleted');
CREATE TYPE "public"."node_family" AS ENUM('document', 'operational');
CREATE TYPE "public"."permission_operation" AS ENUM('read', 'write', 'create', 'delete');
CREATE TYPE "public"."permission_type" AS ENUM('allow', 'deny');

CREATE TABLE "action_catalog" (
	"action_type" text PRIMARY KEY NOT NULL,
	"preconditions" jsonb NOT NULL,
	"effects" jsonb NOT NULL,
	"executor" "executor_type" NOT NULL,
	"allowed_lifecycle_transitions" jsonb NOT NULL,
	"failure_mode" text NOT NULL,
	"idempotency_rule" text,
	"log_payload_schema" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "action_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" text NOT NULL,
	"executor_id" text NOT NULL,
	"executor_type" "executor_type" NOT NULL,
	"input" jsonb NOT NULL,
	"effects" jsonb NOT NULL,
	"outcome" "action_outcome" NOT NULL,
	"rejection_reason" text,
	"gate_id" uuid,
	"idempotency_key" text,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "action_property_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" text NOT NULL,
	"node_type" text NOT NULL,
	"property_key" text NOT NULL,
	"operation" "permission_operation" NOT NULL,
	"permission_type" "permission_type" NOT NULL,
	"value_constraint" jsonb,
	"requires_human_gate" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "archetypes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"family" "node_family" NOT NULL,
	"typical_values" jsonb NOT NULL,
	"allowed_mutations" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "edge_catalog" (
	"edge_type" text PRIMARY KEY NOT NULL,
	"domain" jsonb NOT NULL,
	"range" jsonb NOT NULL,
	"cardinality" text NOT NULL,
	"representation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edge_type" text NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"properties" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" text NOT NULL,
	"executor_id" text NOT NULL,
	"input" jsonb NOT NULL,
	"proposed_effects" jsonb NOT NULL,
	"status" "gate_status" DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"trigger_patterns" jsonb NOT NULL,
	"applicable_node_types" jsonb NOT NULL,
	"required_actions" jsonb NOT NULL,
	"optional_actions" jsonb NOT NULL,
	"lifecycle" "lifecycle_status" NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "node_catalog" (
	"node_type" text PRIMARY KEY NOT NULL,
	"family" "node_family" NOT NULL,
	"archetype_id" text NOT NULL,
	"typical_value_overrides" jsonb NOT NULL,
	"lifecycle_transitions" jsonb NOT NULL,
	"content_guide" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" text NOT NULL,
	"lifecycle_status" "lifecycle_status" NOT NULL,
	"properties" jsonb NOT NULL,
	"content" text,
	"content_url" text,
	"provenance" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "property_catalog" (
	"property_key" text PRIMARY KEY NOT NULL,
	"value_type" text NOT NULL,
	"constraints" jsonb NOT NULL,
	"owning_actions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "action_property_permissions" ADD CONSTRAINT "action_property_permissions_action_type_action_catalog_action_type_fk" FOREIGN KEY ("action_type") REFERENCES "public"."action_catalog"("action_type") ON DELETE no action ON UPDATE no action;
ALTER TABLE "action_property_permissions" ADD CONSTRAINT "action_property_permissions_node_type_node_catalog_node_type_fk" FOREIGN KEY ("node_type") REFERENCES "public"."node_catalog"("node_type") ON DELETE no action ON UPDATE no action;
ALTER TABLE "edges" ADD CONSTRAINT "edges_edge_type_edge_catalog_edge_type_fk" FOREIGN KEY ("edge_type") REFERENCES "public"."edge_catalog"("edge_type") ON DELETE no action ON UPDATE no action;
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_node_id_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_node_id_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "node_catalog" ADD CONSTRAINT "node_catalog_archetype_id_archetypes_id_fk" FOREIGN KEY ("archetype_id") REFERENCES "public"."archetypes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_node_type_node_catalog_node_type_fk" FOREIGN KEY ("node_type") REFERENCES "public"."node_catalog"("node_type") ON DELETE no action ON UPDATE no action;
