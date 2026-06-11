import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "Draft",
  "Active",
  "Archived",
  "Deleted",
]);

export const executorTypeEnum = pgEnum("executor_type", [
  "Agent",
  "Human",
  "System",
]);

export const nodeFamilyEnum = pgEnum("node_family", ["document", "operational"]);

export const permissionOperationEnum = pgEnum("permission_operation", [
  "read",
  "write",
  "create",
  "delete",
]);

export const permissionTypeEnum = pgEnum("permission_type", ["allow", "deny"]);

export const gateStatusEnum = pgEnum("gate_status", [
  "pending",
  "approved",
  "rejected",
]);

export const actionOutcomeEnum = pgEnum("action_outcome", [
  "committed",
  "gated",
  "rejected",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  onboardingStep: text("onboarding_step").notNull().default("profile"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  locale: text("locale").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerUserId: uuid("owner_user_id").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgSlugUnique: uniqueIndex("projects_org_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
  }),
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserUnique: uniqueIndex("organization_memberships_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
  }),
);

export const userProjectPreferences = pgTable("user_project_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  orgSlug: text("org_slug").notNull(),
  projectSlug: text("project_slug").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const archetypes = pgTable("archetypes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  family: nodeFamilyEnum("family").notNull(),
  typicalValues: jsonb("typical_values").notNull().$type<Record<string, unknown>>(),
  allowedMutations: jsonb("allowed_mutations").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const nodeCatalog = pgTable("node_catalog", {
  nodeType: text("node_type").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  family: nodeFamilyEnum("family").notNull(),
  archetypeId: text("archetype_id")
    .notNull()
    .references(() => archetypes.id),
  typicalValueOverrides: jsonb("typical_value_overrides")
    .notNull()
    .$type<Record<string, unknown>>(),
  lifecycleTransitions: jsonb("lifecycle_transitions")
    .notNull()
    .$type<Record<string, string[]>>(),
  contentGuide: text("content_guide"),
  propertyRefs: jsonb("property_refs").notNull().default([]).$type<string[]>(),
  allowedActionRefs: jsonb("allowed_action_refs")
    .notNull()
    .default([])
    .$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const nodes = pgTable("nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeType: text("node_type")
    .notNull()
    .references(() => nodeCatalog.nodeType),
  lifecycleStatus: lifecycleStatusEnum("lifecycle_status").notNull(),
  properties: jsonb("properties").notNull().$type<Record<string, unknown>>(),
  content: text("content"),
  contentUrl: text("content_url"),
  provenance: jsonb("provenance").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const edgeCatalog = pgTable("edge_catalog", {
  edgeType: text("edge_type").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  domain: jsonb("domain").notNull().$type<string[]>(),
  range: jsonb("range").notNull().$type<string[]>(),
  cardinality: text("cardinality").notNull(),
  representation: text("representation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const edges = pgTable("edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  edgeType: text("edge_type")
    .notNull()
    .references(() => edgeCatalog.edgeType),
  sourceNodeId: uuid("source_node_id")
    .notNull()
    .references(() => nodes.id),
  targetNodeId: uuid("target_node_id")
    .notNull()
    .references(() => nodes.id),
  properties: jsonb("properties").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const propertyCatalog = pgTable("property_catalog", {
  propertyKey: text("property_key").primaryKey(),
  valueType: text("value_type").notNull(),
  constraints: jsonb("constraints").notNull().$type<Record<string, unknown>>(),
  owningActions: jsonb("owning_actions").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const actionCatalog = pgTable("action_catalog", {
  actionType: text("action_type").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  scope: jsonb("scope")
    .notNull()
    .default({ kind: "global" })
    .$type<Record<string, unknown>>(),
  preconditions: jsonb("preconditions").notNull().$type<Record<string, unknown>>(),
  effects: jsonb("effects").notNull().$type<unknown[]>(),
  executor: executorTypeEnum("executor").notNull(),
  allowedLifecycleTransitions: jsonb("allowed_lifecycle_transitions")
    .notNull()
    .$type<Record<string, string[]>>(),
  failureMode: text("failure_mode").notNull(),
  idempotencyRule: text("idempotency_rule"),
  logPayloadSchema: jsonb("log_payload_schema")
    .notNull()
    .$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const actionPropertyPermissions = pgTable("action_property_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionType: text("action_type")
    .notNull()
    .references(() => actionCatalog.actionType),
  nodeType: text("node_type")
    .notNull()
    .references(() => nodeCatalog.nodeType),
  propertyKey: text("property_key").notNull(),
  operation: permissionOperationEnum("operation").notNull(),
  permissionType: permissionTypeEnum("permission_type").notNull(),
  valueConstraint: jsonb("value_constraint").$type<Record<string, unknown>>(),
  requiresHumanGate: boolean("requires_human_gate").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const instructions = pgTable("instructions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  triggerPatterns: jsonb("trigger_patterns").notNull().$type<string[]>(),
  applicableNodeTypes: jsonb("applicable_node_types").notNull().$type<string[]>(),
  requiredActions: jsonb("required_actions").notNull().$type<string[]>(),
  optionalActions: jsonb("optional_actions").notNull().$type<string[]>(),
  lifecycle: lifecycleStatusEnum("lifecycle").notNull(),
  body: text("body").notNull(),
  scope: jsonb("scope")
    .notNull()
    .default({ kind: "global" })
    .$type<Record<string, unknown>>(),
  triggers: jsonb("triggers").notNull().default([]).$type<string[]>(),
  workflowSteps: jsonb("workflow_steps").notNull().default([]).$type<unknown[]>(),
  allowedActions: jsonb("allowed_actions").notNull().default([]).$type<string[]>(),
  outputContract: jsonb("output_contract")
    .notNull()
    .default({})
    .$type<Record<string, unknown>>(),
  gatePolicy: jsonb("gate_policy")
    .notNull()
    .default({})
    .$type<Record<string, unknown>>(),
  completionCriteria: text("completion_criteria"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const actionLog = pgTable("action_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionType: text("action_type").notNull(),
  executorId: text("executor_id").notNull(),
  executorType: executorTypeEnum("executor_type").notNull(),
  input: jsonb("input").notNull().$type<Record<string, unknown>>(),
  effects: jsonb("effects").notNull().$type<unknown[]>(),
  outcome: actionOutcomeEnum("outcome").notNull(),
  rejectionReason: text("rejection_reason"),
  gateId: uuid("gate_id"),
  idempotencyKey: text("idempotency_key"),
  metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gates = pgTable("gates", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionType: text("action_type").notNull(),
  executorId: text("executor_id").notNull(),
  input: jsonb("input").notNull().$type<Record<string, unknown>>(),
  proposedEffects: jsonb("proposed_effects").notNull().$type<unknown[]>(),
  status: gateStatusEnum("status").notNull().default("pending"),
  reason: text("reason").notNull(),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
