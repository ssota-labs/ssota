import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
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

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "ready",
  "running",
  "blocked",
  "done",
  "cancelled",
  "failed",
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

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    workflowKey: text("workflow_key").notNull(),
    title: text("title").notNull(),
    status: taskStatusEnum("status").notNull().default("pending"),
    executorType: executorTypeEnum("executor_type").notNull().default("Agent"),
    assignee: text("assignee"),
    subjectId: text("subject_id"),
    targetNodeId: uuid("target_node_id").references(() => nodes.id, {
      onDelete: "set null",
    }),
    parentTaskId: uuid("parent_task_id"),
    context: jsonb("context").notNull().default({}).$type<Record<string, unknown>>(),
    acceptanceCriteria: jsonb("acceptance_criteria")
      .notNull()
      .default([])
      .$type<unknown[]>(),
    idempotencyKey: text("idempotency_key"),
    result: jsonb("result").notNull().default({}).$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idempotencyUnique: uniqueIndex("tasks_project_idempotency_unique")
      .on(table.projectId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    projectStatusIdx: index("tasks_project_status_idx").on(
      table.projectId,
      table.status,
    ),
    projectWorkflowKeyIdx: index("tasks_project_workflow_key_idx").on(
      table.projectId,
      table.workflowKey,
    ),
    projectAssigneeIdx: index("tasks_project_assignee_idx").on(
      table.projectId,
      table.assignee,
    ),
    projectSubjectIdIdx: index("tasks_project_subject_id_idx").on(
      table.projectId,
      table.subjectId,
    ),
    projectTargetNodeIdx: index("tasks_project_target_node_idx").on(
      table.projectId,
      table.targetNodeId,
    ),
  }),
);

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    nodeType: text("node_type").notNull(),
    title: text("title").notNull().default(""),
    properties: jsonb("properties")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    content: text("content"),
    lifecycleStatus: lifecycleStatusEnum("lifecycle_status")
      .notNull()
      .default("Draft"),
    schemaVersion: integer("schema_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectNodeTypeIdx: index("nodes_project_node_type_idx").on(
      table.projectId,
      table.nodeType,
    ),
    projectLifecycleIdx: index("nodes_project_lifecycle_status_idx").on(
      table.projectId,
      table.lifecycleStatus,
    ),
  }),
);

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    edgeType: text("edge_type").notNull(),
    sourceNodeId: uuid("source_node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    targetNodeId: uuid("target_node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    properties: jsonb("properties")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectSourceIdx: index("edges_project_source_node_id_idx").on(
      table.projectId,
      table.sourceNodeId,
    ),
    projectTargetIdx: index("edges_project_target_node_id_idx").on(
      table.projectId,
      table.targetNodeId,
    ),
  }),
);
