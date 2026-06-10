import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
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
  title: text("title").notNull(),
  triggerPatterns: jsonb("trigger_patterns").notNull().$type<string[]>(),
  applicableNodeTypes: jsonb("applicable_node_types").notNull().$type<string[]>(),
  requiredActions: jsonb("required_actions").notNull().$type<string[]>(),
  optionalActions: jsonb("optional_actions").notNull().$type<string[]>(),
  lifecycle: lifecycleStatusEnum("lifecycle").notNull(),
  body: text("body").notNull(),
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
