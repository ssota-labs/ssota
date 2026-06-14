import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  uniqueIndex,
  primaryKey,
  index,
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

export const impactQueueStatusEnum = pgEnum("impact_queue_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "dead",
  "skipped",
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

export const nodeCatalog = pgTable(
  "node_catalog",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    nodeType: text("node_type").notNull(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    family: nodeFamilyEnum("family").notNull(),
    archetypeId: text("archetype_id").references(() => archetypes.id),
    typicalValueOverrides: jsonb("typical_value_overrides")
      .notNull()
      .$type<Record<string, unknown>>(),
    lifecycleTransitions: jsonb("lifecycle_transitions")
      .notNull()
      .$type<Record<string, string[]>>(),
    contentGuide: text("content_guide"),
    propertySchema: jsonb("property_schema")
      .notNull()
      .default({})
      .$type<Record<string, Record<string, unknown>>>(),
    allowedActionRefs: jsonb("allowed_action_refs")
      .notNull()
      .default([])
      .$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.nodeType] }),
    projectSlugUnique: uniqueIndex("node_catalog_project_slug_unique").on(
      table.projectId,
      table.slug,
    ),
  }),
);

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    nodeType: text("node_type").notNull(),
    lifecycleStatus: lifecycleStatusEnum("lifecycle_status").notNull(),
    properties: jsonb("properties").notNull().$type<Record<string, unknown>>(),
    content: text("content"),
    contentUrl: text("content_url"),
    provenance: jsonb("provenance").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectNodeTypeIdx: index("nodes_project_node_type_idx").on(
      table.projectId,
      table.nodeType,
    ),
  }),
);

export const edgeCatalog = pgTable(
  "edge_catalog",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    edgeType: text("edge_type").notNull(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    domain: jsonb("domain").notNull().$type<string[]>(),
    range: jsonb("range").notNull().$type<string[]>(),
    cardinality: text("cardinality").notNull(),
    representation: text("representation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.edgeType] }),
    projectSlugUnique: uniqueIndex("edge_catalog_project_slug_unique").on(
      table.projectId,
      table.slug,
    ),
  }),
);

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    edgeType: text("edge_type").notNull(),
    sourceNodeId: uuid("source_node_id")
      .notNull()
      .references(() => nodes.id),
    targetNodeId: uuid("target_node_id")
      .notNull()
      .references(() => nodes.id),
    properties: jsonb("properties").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("edges_project_id_idx").on(table.projectId),
  }),
);

export const actionCatalog = pgTable(
  "action_catalog",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    actionType: text("action_type").notNull(),
    slug: text("slug").notNull(),
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
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.actionType] }),
    projectSlugUnique: uniqueIndex("action_catalog_project_slug_unique").on(
      table.projectId,
      table.slug,
    ),
  }),
);

export const actionPropertyPermissions = pgTable("action_property_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  actionType: text("action_type").notNull(),
  nodeType: text("node_type").notNull(),
  propertyKey: text("property_key").notNull(),
  operation: permissionOperationEnum("operation").notNull(),
  permissionType: permissionTypeEnum("permission_type").notNull(),
  valueConstraint: jsonb("value_constraint").$type<Record<string, unknown>>(),
  requiresHumanGate: boolean("requires_human_gate").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const instructions = pgTable(
  "instructions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    slug: text("slug").notNull(),
    instructionKey: text("instruction_key"),
    title: text("title").notNull(),
    triggerPatterns: jsonb("trigger_patterns").notNull().$type<string[]>(),
    applicableNodeTypes: jsonb("applicable_node_types").notNull().$type<string[]>(),
    requiredActions: jsonb("required_actions").notNull().$type<string[]>(),
    optionalActions: jsonb("optional_actions").notNull().$type<string[]>(),
    lifecycle: lifecycleStatusEnum("lifecycle").notNull(),
    body: text("body"),
    contentUrl: text("content_url"),
    scope: jsonb("scope")
      .notNull()
      .default({ kind: "global" })
      .$type<Record<string, unknown>>(),
    triggers: jsonb("triggers").notNull().default([]).$type<import("@ssota/contracts").WorkflowTriggerEvent[]>(),
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
  },
  (table) => ({
    projectSlugUnique: uniqueIndex("instructions_project_slug_unique").on(
      table.projectId,
      table.slug,
    ),
  }),
);

export const actionLog = pgTable(
  "action_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
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
  },
  (table) => ({
    projectIdIdx: index("action_log_project_id_idx").on(table.projectId),
  }),
);

export const gates = pgTable(
  "gates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    actionType: text("action_type").notNull(),
    executorId: text("executor_id").notNull(),
    input: jsonb("input").notNull().$type<Record<string, unknown>>(),
    proposedEffects: jsonb("proposed_effects").notNull().$type<unknown[]>(),
    status: gateStatusEnum("status").notNull().default("pending"),
    reason: text("reason").notNull(),
    decisionNote: text("decision_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("gates_project_id_idx").on(table.projectId),
  }),
);

export const impactQueue = pgTable(
  "impact_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    sourceActionLogId: uuid("source_action_log_id")
      .notNull()
      .references(() => actionLog.id),
    sourceNodeId: uuid("source_node_id").references(() => nodes.id),
    targetNodeId: uuid("target_node_id").references(() => nodes.id),
    dependencyEdgeId: uuid("dependency_edge_id").references(() => edges.id),
    workflowKey: text("workflow_key").notNull(),
    instructionId: uuid("instruction_id").references(() => instructions.id),
    status: impactQueueStatusEnum("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(0),
    runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
    lockedBy: text("locked_by"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    idempotencyKey: text("idempotency_key").notNull(),
    lastError: text("last_error"),
    payload: jsonb("payload").notNull().default({}).$type<Record<string, unknown>>(),
    result: jsonb("result").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    idempotencyUnique: uniqueIndex("impact_queue_project_idempotency_unique").on(
      table.projectId,
      table.idempotencyKey,
    ),
    claimIdx: index("impact_queue_claim_idx").on(
      table.projectId,
      table.status,
      table.runAt,
      table.priority,
      table.createdAt,
    ),
    sourceLogIdx: index("impact_queue_project_source_log_idx").on(
      table.projectId,
      table.sourceActionLogId,
    ),
    targetNodeIdx: index("impact_queue_project_target_node_idx").on(
      table.projectId,
      table.targetNodeId,
    ),
  }),
);
