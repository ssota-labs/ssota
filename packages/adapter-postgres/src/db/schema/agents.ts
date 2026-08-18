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
import { accounts, organizations, profiles, teamspaces } from "./platform.js";
import { nodes, workers } from "./ontology.js";

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
