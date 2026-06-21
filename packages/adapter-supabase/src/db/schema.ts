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

/**
 * End-user data partition within a deployed tenant SaaS (Phase 5). A Project is
 * the builder's agent-SaaS definition; accounts are the isolated spaces
 * SSOTA-naive end users work in. Instance rows carry `account_id` (null =
 * shared/builder). No recursive org/project for end users — sub-structure is
 * expressed via the builder's node catalog.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectSlugUnique: uniqueIndex("accounts_project_slug_unique").on(
      table.projectId,
      table.slug,
    ),
    projectIdx: index("accounts_project_id_idx").on(table.projectId),
  }),
);

export const accountMemberships = pgTable(
  "account_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    accountUserUnique: uniqueIndex("account_memberships_account_user_unique").on(
      table.accountId,
      table.userId,
    ),
  }),
);

/**
 * Records a third-party provider an account connected via Vercel Connect (one
 * row per account × connector). `installationId` is the provider installation
 * (Slack team id, GitHub org id); the agent uses it to scope `getToken` so each
 * account's agent acts on that account's own workspace.
 */
export const accountConnections = pgTable(
  "account_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** Connector uid, e.g. "slack/acme-slack". */
    connector: text("connector").notNull(),
    /**
     * Provider installation id (Connect). Empty string for single-install
     * connectors (no workspace/org scoping) so the unique index below treats it
     * as a stable key; multi-workspace connectors get one row per installation.
     */
    installationId: text("installation_id").notNull().default(""),
    /** Provider tenant id (e.g. Slack team id). */
    tenantId: text("tenant_id"),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    accountConnectorInstallationUnique: uniqueIndex(
      "account_connections_account_connector_installation_unique",
    ).on(table.accountId, table.connector, table.installationId),
    projectIdx: index("account_connections_project_id_idx").on(table.projectId),
  }),
);

/**
 * Maps a chat workspace (Slack team, Discord guild, Telegram chat) to the
 * SSOTA project it belongs to (and optionally an account). Lets the creator
 * connect a workspace to one of their own projects without a separate tenant
 * deployment — inbound messages resolve their project by `workspaceKey`.
 */
export const chatWorkspaces = pgTable(
  "chat_workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Optional data partition; null = the whole project (builder scope). */
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    /** slack | discord | telegram | … */
    platform: text("platform").notNull(),
    /** Provider workspace id (Slack team, Discord guild, Telegram chat). */
    workspaceKey: text("workspace_key").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceKeyUnique: uniqueIndex("chat_workspaces_workspace_key_unique").on(
      table.workspaceKey,
    ),
    projectIdx: index("chat_workspaces_project_id_idx").on(table.projectId),
  }),
);

export const nodeCatalog = pgTable(
  "node_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    propertySchema: jsonb("property_schema")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectKeyUnique: uniqueIndex("node_catalog_project_key_unique").on(
      table.projectId,
      table.key,
    ),
    projectIdx: index("node_catalog_project_id_idx").on(table.projectId),
  }),
);

export const edgeCatalog = pgTable(
  "edge_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    domainCatalogIds: uuid("domain_catalog_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    rangeCatalogIds: uuid("range_catalog_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    propertySchema: jsonb("property_schema").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectKeyUnique: uniqueIndex("edge_catalog_project_key_unique").on(
      table.projectId,
      table.key,
    ),
    projectIdx: index("edge_catalog_project_id_idx").on(table.projectId),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    // End-user data partition (Phase 5). Null = builder/shared scope.
    accountId: uuid("account_id"),
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
    nodeCatalogId: uuid("node_catalog_id")
      .notNull()
      .references(() => nodeCatalog.id, { onDelete: "restrict" }),
    // End-user data partition (Phase 5). Null = builder/shared scope.
    accountId: uuid("account_id"),
    title: text("title").notNull().default(""),
    properties: jsonb("properties")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    schemaVersion: integer("schema_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectCatalogIdx: index("nodes_project_node_catalog_id_idx").on(
      table.projectId,
      table.nodeCatalogId,
    ),
    projectLifecycleIdx: index("nodes_project_lifecycle_status_idx").on(
      table.projectId,
      sql`(properties->>'lifecycleStatus')`,
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
    edgeCatalogId: uuid("edge_catalog_id")
      .notNull()
      .references(() => edgeCatalog.id, { onDelete: "restrict" }),
    // End-user data partition (Phase 5). Null = builder/shared scope.
    accountId: uuid("account_id"),
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
    projectCatalogIdx: index("edges_project_edge_catalog_id_idx").on(
      table.projectId,
      table.edgeCatalogId,
    ),
  }),
);

/**
 * Durable agent run ↔ task bridge. One row per `runSsotaAgentWorkflow`
 * execution; records the workflow run id, model, token usage and timing.
 */
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // End-user data partition (Phase 5). Null = builder/shared scope.
    accountId: uuid("account_id"),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    workflowRunId: text("workflow_run_id").notNull(),
    status: text("status").notNull().default("running"),
    model: text("model"),
    usage: jsonb("usage").notNull().default({}).$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("agent_runs_project_id_idx").on(table.projectId),
    taskIdx: index("agent_runs_task_id_idx").on(table.taskId),
    workflowRunUnique: uniqueIndex("agent_runs_workflow_run_id_unique").on(
      table.workflowRunId,
    ),
  }),
);

/**
 * In-app web chat conversation. Each thread holds the persisted multi-turn
 * history for one console chat; each user turn still spawns a durable agent
 * task (see `tasks.context.chat`), but the conversation lives here so the UI
 * rehydrates on reload and prior turns are replayed into the agent.
 */
export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // End-user data partition (Phase 5). Null = builder/shared scope.
    accountId: uuid("account_id"),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectAccountIdx: index("chat_threads_project_account_id_idx").on(
      table.projectId,
      table.accountId,
    ),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    /** AI SDK UIMessage parts (text, tool/data parts) for faithful rehydrate. */
    parts: jsonb("parts").notNull().default([]).$type<unknown[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    threadIdx: index("chat_messages_thread_id_idx").on(table.threadId),
  }),
);
