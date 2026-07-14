import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  primaryKey,
  foreignKey,
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

export const agentTriggerEnum = pgEnum("agent_trigger", [
  "chat",
  "chatbot",
  "task",
  "schedule",
  "heartbeat",
  "manual",
  "gate_resume",
]);

export const scheduleTargetTypeEnum = pgEnum("schedule_target_type", [
  "main_heartbeat",
  "agent",
  "ready_task_dispatch",
]);

export const agentRuntimeKindEnum = pgEnum("agent_runtime_kind", [
  "main",
  "task",
  "scheduler",
  "worker",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  onboardingStep: text("onboarding_step").notNull().default("profile"),
  onboardingDraftProjectName: text("onboarding_draft_project_name"),
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

export const teamspaces = pgTable(
  "teamspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    appEnabled: boolean("app_enabled").notNull().default(false),
    mainInstructions: jsonb("main_instructions")
      .notNull()
      .default([])
      .$type<unknown[]>(),
    mainToolBundles: jsonb("main_tool_bundles")
      .notNull()
      .default([])
      .$type<string[]>(),
    mainRunPolicy: jsonb("main_run_policy")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgSlugUnique: uniqueIndex("teamspaces_org_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
  }),
);

/** @deprecated Use `teamspaces` — alias for transitional imports. */
export const projects = teamspaces;

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

export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    inviterUserId: uuid("inviter_user_id")
      .notNull()
      .references(() => profiles.id),
    inviteeEmail: text("invitee_email").notNull(),
    inviteeUserId: uuid("invitee_user_id").references(() => profiles.id),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdIdx: index("organization_invitations_organization_id_idx").on(
      table.organizationId,
    ),
  }),
);

export const organizationBilling = pgTable("organization_billing", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").notNull().default("none"),
  status: text("status").notNull().default("none"),
  seatQuantity: integer("seat_quantity").notNull().default(1),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * End-user data partition within a deployed tenant SaaS (Phase 5). A Teamspace is
 * the builder's agent-SaaS definition; accounts are the isolated spaces
 * SSOTA-naive end users work in. Instance rows carry `account_id` (null =
 * shared/builder). No recursive org/project for end users — sub-structure is
 * expressed via the builder's node catalog.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectSlugUnique: uniqueIndex("accounts_project_slug_unique").on(
      table.teamspaceId,
      table.slug,
    ),
    projectIdx: index("accounts_project_id_idx").on(table.teamspaceId),
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
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
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
    /** Supabase user id for user-subject Connect grants (oauth/Notion, linear/*). */
    subjectUserId: text("subject_user_id"),
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
    projectIdx: index("account_connections_project_id_idx").on(table.teamspaceId),
  }),
);

/**
 * Per-(org, user, toolkit) connector tool restrictions. When a user disables
 * specific tools for a connected toolkit in the Connectors sheet, those slugs
 * are excluded from the Composio Tool Router session
 * (`tools: { <toolkit>: { disable } }`). Keyed by the Composio entity
 * (org + profile), so a setting applies across that org's projects.
 */
export const connectorToolSettings = pgTable(
  "connector_tool_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** Composio toolkit slug (e.g. "gmail", "slack"). */
    toolkit: text("toolkit").notNull(),
    /** Composio connected-account id; NULL = legacy per-toolkit row (deprecated). */
    connectionId: text("connection_id"),
    /** Tool slugs the user has disabled for this connection. */
    disabledTools: jsonb("disabled_tools")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueConnection: uniqueIndex(
      "connector_tool_settings_org_profile_connection_unique",
    )
      .on(table.orgId, table.profileId, table.connectionId)
      .where(sql`${table.connectionId} IS NOT NULL`),
    uniqueLegacyToolkit: uniqueIndex(
      "connector_tool_settings_legacy_toolkit_unique",
    )
      .on(table.orgId, table.profileId, table.toolkit)
      .where(sql`${table.connectionId} IS NULL`),
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
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
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
    projectIdx: index("chat_workspaces_project_id_idx").on(table.teamspaceId),
  }),
);

export const nodeCatalog = pgTable(
  "node_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    propertySchema: jsonb("property_schema")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgKeyUnique: uniqueIndex("node_catalog_organization_key_unique").on(
      table.organizationId,
      table.key,
    ),
    orgIdx: index("node_catalog_organization_id_idx").on(table.organizationId),
  }),
);

export const edgeCatalog = pgTable(
  "edge_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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
    orgKeyUnique: uniqueIndex("edge_catalog_organization_key_unique").on(
      table.organizationId,
      table.key,
    ),
    orgIdx: index("edge_catalog_organization_id_idx").on(table.organizationId),
  }),
);

/**
 * Agent definitions — BlockNote jsonb instructions, teamspace-scoped (optional
 * account override). Replaces legacy `workflow_instructions`.
 */
export const agentDefinitions = pgTable(
  "agent_definitions",
  {
    id: uuid("id").notNull(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    instructions: jsonb("instructions")
      .notNull()
      .default([])
      .$type<unknown[]>(),
    toolBundles: jsonb("tool_bundles")
      .notNull()
      .default([])
      .$type<string[]>(),
    nodeScopes: jsonb("node_scopes")
      .notNull()
      .default([])
      .$type<unknown[]>(),
    runPolicy: jsonb("run_policy")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.teamspaceId, table.id] }),
    teamspaceIdx: index("agent_definitions_teamspace_id_idx").on(table.teamspaceId),
  }),
);

/** @deprecated Use `agentDefinitions` */
export const workflowInstructions = agentDefinitions;

export const workers = pgTable(
  "workers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    kind: text("kind").notNull().default("tool"),
    inputSchema: jsonb("input_schema")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    outputSchema: jsonb("output_schema").$type<Record<string, unknown> | null>(),
    script: text("script").notNull(),
    runtime: text("runtime").notNull().default("vercel_sandbox"),
    kindConfig: jsonb("kind_config")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamspaceKeyUnique: uniqueIndex("workers_teamspace_key_unique")
      .on(table.teamspaceId, table.key)
      .where(sql`${table.accountId} IS NULL`),
    teamspaceAccountKeyUnique: uniqueIndex(
      "workers_teamspace_account_key_unique",
    )
      .on(table.teamspaceId, table.accountId, table.key)
      .where(sql`${table.accountId} IS NOT NULL`),
    teamspaceIdx: index("workers_teamspace_id_idx").on(table.teamspaceId),
  }),
);

/** @deprecated Use `workers` */
export const scriptTools = workers;

export const agentDefinitionWorkers = pgTable(
  "agent_definition_workers",
  {
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    agentDefinitionId: uuid("agent_definition_id").notNull(),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    config: jsonb("config")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
  },
  (table) => ({
    definitionFk: foreignKey({
      columns: [table.teamspaceId, table.agentDefinitionId],
      foreignColumns: [agentDefinitions.teamspaceId, agentDefinitions.id],
    }).onDelete("cascade"),
    pk: uniqueIndex("agent_definition_workers_pk").on(
      table.agentDefinitionId,
      table.workerId,
    ),
  }),
);

/** @deprecated Use `agentDefinitionWorkers` */
export const agentDefinitionScriptTools = agentDefinitionWorkers;

export const skillSourceEnum = pgEnum("skill_source", [
  "builtin",
  "custom",
]);

export const skillPackageSourceTypeEnum = pgEnum("skill_package_source_type", [
  "platform",
  "github",
  "inline",
]);

export const skillLockStatusEnum = pgEnum("skill_lock_status", [
  "ready",
  "pending",
  "failed",
]);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    source: skillSourceEnum("source").notNull().default("custom"),
    externalId: text("external_id"),
    contentHash: text("content_hash"),
    metadata: jsonb("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgKeyUnique: uniqueIndex("skills_organization_key_unique")
      .on(table.organizationId, table.key)
      .where(sql`${table.organizationId} IS NOT NULL`),
    platformKeyUnique: uniqueIndex("skills_platform_key_unique")
      .on(table.key)
      .where(sql`${table.organizationId} IS NULL`),
    orgIdx: index("skills_organization_id_idx").on(table.organizationId),
  }),
);

export const skillSnapshots = pgTable(
  "skill_snapshots",
  {
    skillId: uuid("skill_id")
      .primaryKey()
      .references(() => skills.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    files: jsonb("files")
      .notNull()
      .default([])
      .$type<Array<{ path: string; contents: string }>>(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const organizationSkills = pgTable(
  "organization_skills",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex("organization_skills_pk").on(
      table.organizationId,
      table.skillId,
    ),
    skillIdx: index("organization_skills_skill_id_idx").on(table.skillId),
  }),
);

export const skillPackages = pgTable(
  "skill_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    sourceType: skillPackageSourceTypeEnum("source_type").notNull(),
    storageKey: text("storage_key"),
    files: jsonb("files")
      .notNull()
      .default([])
      .$type<Array<{ path: string; contents: string }>>(),
    fileCount: integer("file_count").notNull().default(0),
    sizeBytes: integer("size_bytes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgHashUnique: uniqueIndex("skill_packages_org_hash_unique").on(
      table.organizationId,
      table.contentHash,
    ),
    orgIdx: index("skill_packages_organization_id_idx").on(table.organizationId),
  }),
);

export const agentDefinitionSkills = pgTable(
  "agent_definition_skills",
  {
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    agentDefinitionId: uuid("agent_definition_id").notNull(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    lock: jsonb("lock").$type<{
      source: string;
      sourceType: "github" | "inline" | "platform";
      skillPath: string;
      computedHash: string;
      ref?: string;
    } | null>(),
    lockStatus: skillLockStatusEnum("lock_status"),
    lockError: text("lock_error"),
  },
  (table) => ({
    definitionFk: foreignKey({
      columns: [table.teamspaceId, table.agentDefinitionId],
      foreignColumns: [agentDefinitions.teamspaceId, agentDefinitions.id],
    }).onDelete("cascade"),
    pk: uniqueIndex("agent_definition_skills_pk").on(
      table.agentDefinitionId,
      table.skillId,
    ),
  }),
);

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    agentDefinitionId: uuid("agent_definition_id").notNull(),
    targetType: scheduleTargetTypeEnum("target_type")
      .notNull()
      .default("agent"),
    cronExpression: text("cron_expression").notNull(),
    // IANA timezone the cron expression is evaluated in (the heartbeat ticks in
    // UTC, but each schedule's window/days are interpreted in this zone).
    timezone: text("timezone").notNull().default("Asia/Seoul"),
    enabled: boolean("enabled").notNull().default(true),
    idempotencyPrefix: text("idempotency_prefix").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("schedules_project_id_idx").on(table.teamspaceId),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id),
    // End-user data partition (Phase 5). Null = builder/shared scope.
    accountId: uuid("account_id"),
    agentDefinitionId: uuid("agent_definition_id"),
    title: text("title").notNull(),
    status: taskStatusEnum("status").notNull().default("pending"),
    executorType: executorTypeEnum("executor_type").notNull().default("Agent"),
    assignee: text("assignee"),
    subjectId: text("subject_id"),
    targetNodeId: uuid("target_node_id").references(() => nodes.id, {
      onDelete: "set null",
    }),
    sandboxEnvironmentId: uuid("sandbox_environment_id"),
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
    agentDefinitionFk: foreignKey({
      columns: [table.teamspaceId, table.agentDefinitionId],
      foreignColumns: [agentDefinitions.teamspaceId, agentDefinitions.id],
    }).onDelete("set null"),
    idempotencyUnique: uniqueIndex("tasks_project_idempotency_unique")
      .on(table.teamspaceId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    projectStatusIdx: index("tasks_project_status_idx").on(
      table.teamspaceId,
      table.status,
    ),
    teamspaceAgentDefinitionIdx: index("tasks_teamspace_agent_definition_id_idx").on(
      table.teamspaceId,
      table.agentDefinitionId,
    ),
    projectAssigneeIdx: index("tasks_project_assignee_idx").on(
      table.teamspaceId,
      table.assignee,
    ),
    projectSubjectIdIdx: index("tasks_project_subject_id_idx").on(
      table.teamspaceId,
      table.subjectId,
    ),
    projectTargetNodeIdx: index("tasks_project_target_node_idx").on(
      table.teamspaceId,
      table.targetNodeId,
    ),
  }),
);

export const sandboxSessionStatusEnum = pgEnum("sandbox_session_status", [
  "provisioning",
  "ready",
  "running",
  "stopped",
  "failed",
]);

export const sandboxSetupStatusEnum = pgEnum("sandbox_setup_status", [
  "pending",
  "cloning",
  "installing",
  "ready",
  "failed",
]);

export const sandboxSnapshotKindEnum = pgEnum("sandbox_snapshot_kind", [
  "base",
  "project",
  "run",
]);

export const sandboxEnvironments = pgTable(
  "sandbox_environments",
  {
    id: uuid("id").notNull(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    runtime: text("runtime").notNull().default("node24"),
    workingRoot: text("working_root").notNull().default("/vercel/sandbox"),
    primarySourceKey: text("primary_source_key"),
    setupScript: text("setup_script"),
    envPolicy: jsonb("env_policy")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    ports: jsonb("ports").notNull().default([]).$type<number[]>(),
    baseSnapshotId: uuid("base_snapshot_id"),
    latestProjectSnapshotId: uuid("latest_project_snapshot_id"),
    persistencePolicy: jsonb("persistence_policy")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.teamspaceId, table.id] }),
    teamspaceKeyUnique: uniqueIndex("sandbox_environments_teamspace_key_unique")
      .on(table.teamspaceId, table.key)
      .where(sql`${table.accountId} IS NULL`),
    teamspaceAccountKeyUnique: uniqueIndex(
      "sandbox_environments_teamspace_account_key_unique",
    )
      .on(table.teamspaceId, table.accountId, table.key)
      .where(sql`${table.accountId} IS NOT NULL`),
    teamspaceIdx: index("sandbox_environments_teamspace_id_idx").on(
      table.teamspaceId,
    ),
  }),
);

export const sandboxSources = pgTable(
  "sandbox_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    sandboxEnvironmentId: uuid("sandbox_environment_id").notNull(),
    key: text("key").notNull(),
    url: text("url").notNull(),
    provider: text("provider").notNull().default("github"),
    repoOwner: text("repo_owner"),
    repoName: text("repo_name"),
    branch: text("branch").notNull().default("main"),
    revision: text("revision"),
    path: text("path").notNull(),
    primary: boolean("primary").notNull().default(false),
    authPolicy: jsonb("auth_policy")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
  },
  (table) => ({
    environmentFk: foreignKey({
      columns: [table.teamspaceId, table.sandboxEnvironmentId],
      foreignColumns: [sandboxEnvironments.teamspaceId, sandboxEnvironments.id],
    }).onDelete("cascade"),
    envKeyUnique: uniqueIndex("sandbox_sources_env_key_unique").on(
      table.sandboxEnvironmentId,
      table.key,
    ),
  }),
);

export const sandboxSessions = pgTable(
  "sandbox_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    sandboxEnvironmentId: uuid("sandbox_environment_id").notNull(),
    vercelSandboxId: text("vercel_sandbox_id"),
    sandboxName: text("sandbox_name"),
    status: sandboxSessionStatusEnum("status").notNull().default("provisioning"),
    currentSnapshotId: uuid("current_snapshot_id"),
    portUrls: jsonb("port_urls")
      .notNull()
      .default({})
      .$type<Record<string, string>>(),
    setupStatus: sandboxSetupStatusEnum("setup_status")
      .notNull()
      .default("pending"),
    allowedRoots: jsonb("allowed_roots")
      .notNull()
      .default([])
      .$type<string[]>(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    ownerAgentRunId: uuid("owner_agent_run_id"),
    ownerTaskId: uuid("owner_task_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    environmentFk: foreignKey({
      columns: [table.teamspaceId, table.sandboxEnvironmentId],
      foreignColumns: [sandboxEnvironments.teamspaceId, sandboxEnvironments.id],
    }).onDelete("cascade"),
    teamspaceIdx: index("sandbox_sessions_teamspace_id_idx").on(table.teamspaceId),
    environmentIdx: index("sandbox_sessions_environment_id_idx").on(
      table.sandboxEnvironmentId,
    ),
  }),
);

export const sandboxSnapshots = pgTable(
  "sandbox_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    sandboxEnvironmentId: uuid("sandbox_environment_id").notNull(),
    vercelSnapshotId: text("vercel_snapshot_id"),
    kind: sandboxSnapshotKindEnum("kind").notNull(),
    label: text("label").notNull(),
    sourceRevisions: jsonb("source_revisions")
      .notNull()
      .default({})
      .$type<Record<string, string>>(),
    createdByAgentRunId: uuid("created_by_agent_run_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    environmentFk: foreignKey({
      columns: [table.teamspaceId, table.sandboxEnvironmentId],
      foreignColumns: [sandboxEnvironments.teamspaceId, sandboxEnvironments.id],
    }).onDelete("cascade"),
    environmentIdx: index("sandbox_snapshots_environment_id_idx").on(
      table.sandboxEnvironmentId,
    ),
  }),
);

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id").references(() => teamspaces.id, {
      onDelete: "cascade",
    }),
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
      table.teamspaceId,
      table.nodeCatalogId,
    ),
    projectLifecycleIdx: index("nodes_project_lifecycle_status_idx").on(
      table.teamspaceId,
      sql`(properties->>'lifecycleStatus')`,
    ),
  }),
);

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id").references(() => teamspaces.id, {
      onDelete: "cascade",
    }),
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
      table.teamspaceId,
      table.sourceNodeId,
    ),
    projectTargetIdx: index("edges_project_target_node_id_idx").on(
      table.teamspaceId,
      table.targetNodeId,
    ),
    projectCatalogIdx: index("edges_project_edge_catalog_id_idx").on(
      table.teamspaceId,
      table.edgeCatalogId,
    ),
  }),
);

/**
 * Pages — Notion-style page tree. A page is NOT 1:1 with a node or workflow:
 * it is a JSON-render dashboard (places catalog React components) that loads
 * data from nodes/edges via `bindings`. Hierarchy lives in `parent_id` (a
 * recursive tree); addressing is flat by `id` (no level encoded in the route,
 * no scope enum). `subject_node_id` optionally anchors the page's bindings to a
 * specific node (e.g. an initiative) — the generic replacement for the old
 * scope/`{$ctx:initiativeId}` special-casing.
 */
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    // End-user data partition (Phase 5). Null = builder/shared scope.
    accountId: uuid("account_id"),
    // Notion-style tree parent. Null = top-level page.
    parentId: uuid("parent_id"),
    // Sibling ordering within a parent.
    position: integer("position").notNull().default(0),
    title: text("title").notNull(),
    icon: text("icon"),
    // Optional human-friendly slug; canonical addressing is still by `id`.
    slug: text("slug"),
    // When set (e.g. "initiative"), this page is a node-type drill-in TEMPLATE:
    // it renders only when the user drills into a node of that catalogKey, with
    // that node injected as the binding `subject`. Null = project-level (L0) page.
    appliesToNodeType: text("applies_to_node_type"),
    // JSON-render element tree (jsonRenderSpecSchema).
    spec: jsonb("spec").notNull().default({}).$type<Record<string, unknown>>(),
    // Data bindings (bindingDefSchema map) resolved against nodes/edges.
    bindings: jsonb("bindings").notNull().default({}).$type<Record<string, unknown>>(),
    // Declarative page actions (pageActionSchema map).
    actions: jsonb("actions").notNull().default({}).$type<Record<string, unknown>>(),
    // Optional anchor node providing data context for this page's bindings.
    subjectNodeId: uuid("subject_node_id").references(() => nodes.id, {
      onDelete: "set null",
    }),
    lifecycleStatus: text("lifecycle_status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectParentIdx: index("pages_project_parent_id_idx").on(
      table.teamspaceId,
      table.parentId,
    ),
    projectIdx: index("pages_project_id_idx").on(table.teamspaceId),
    projectAppliesToIdx: index("pages_project_applies_to_node_type_idx").on(
      table.teamspaceId,
      table.appliesToNodeType,
    ),
    projectSubjectIdx: index("pages_project_subject_node_id_idx").on(
      table.teamspaceId,
      table.subjectNodeId,
    ),
    projectSlugUnique: uniqueIndex("pages_project_slug_unique")
      .on(table.teamspaceId, table.slug)
      .where(sql`${table.slug} IS NOT NULL`),
  }),
);

/**
 * Per-user, per-table-element view state for the advanced data table (column
 * order/visibility/sizing/pinning, sorting, filters, pagination). Keyed by
 * (user, page, element) so each user customizes their own view of a table on a
 * page independently. The component treats this as a controlled prop, so this is
 * the swappable persistence backend.
 */
export const pageViewStates = pgTable(
  "page_view_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    // The JSON-render spec element key of the table within the page.
    elementId: text("element_id").notNull(),
    viewState: jsonb("view_state")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userPageElementUnique: uniqueIndex(
      "page_view_states_user_page_element_unique",
    ).on(table.userId, table.pageId, table.elementId),
    pageUserIdx: index("page_view_states_page_user_idx").on(
      table.pageId,
      table.userId,
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
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    // End-user data partition (Phase 5). Null = builder/shared scope.
    accountId: uuid("account_id"),
    runtimeKind: agentRuntimeKindEnum("runtime_kind").notNull().default("task"),
    agentDefinitionId: uuid("agent_definition_id"),
    trigger: agentTriggerEnum("trigger"),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => chatThreads.id, {
      onDelete: "cascade",
    }),
    scheduleId: uuid("schedule_id").references(() => schedules.id, {
      onDelete: "cascade",
    }),
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
    agentDefinitionFk: foreignKey({
      columns: [table.teamspaceId, table.agentDefinitionId],
      foreignColumns: [agentDefinitions.teamspaceId, agentDefinitions.id],
    }).onDelete("set null"),
    projectIdx: index("agent_runs_project_id_idx").on(table.teamspaceId),
    taskIdx: index("agent_runs_task_id_idx").on(table.taskId),
    threadIdx: index("agent_runs_thread_id_idx").on(table.threadId),
    scheduleIdx: index("agent_runs_schedule_id_idx").on(table.scheduleId),
    workflowRunUnique: uniqueIndex("agent_runs_workflow_run_id_unique").on(
      table.workflowRunId,
    ),
    teamspaceAgentStartedIdx: index("agent_runs_teamspace_agent_started_idx").on(
      table.teamspaceId,
      table.agentDefinitionId,
      table.startedAt.desc(),
    ),
  }),
);

/**
 * Per-run execution transcript for the run-log UI. Rows are written two ways:
 * incrementally per tool call from the durable dispatch step (crash-visible),
 * then replaced by the canonical full transcript at finalize. `parts` uses the
 * AI SDK UIMessage part shape (same convention as `chat_messages.parts`).
 */
export const agentRunMessages = pgTable(
  "agent_run_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    /** Global insert-order identity; ordering key within a run. */
    seq: bigint("seq", { mode: "number" }).generatedAlwaysAsIdentity(),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull().default([]).$type<unknown[]>(),
    /** Idempotency key for incremental tool events (WDK steps retry at-least-once). */
    toolCallId: text("tool_call_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    runSeqIdx: index("agent_run_messages_run_id_seq_idx").on(
      table.runId,
      table.seq,
    ),
    runToolCallUnique: uniqueIndex("agent_run_messages_run_tool_call_unique")
      .on(table.runId, table.toolCallId)
      .where(sql`tool_call_id is not null`),
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
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
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
      table.teamspaceId,
      table.accountId,
    ),
  }),
);

export const betaSignups = pgTable(
  "beta_signups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    source: text("source").notNull().default("landing"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("beta_signups_email_unique").on(table.email),
    statusIdx: index("beta_signups_status_idx").on(table.status),
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
