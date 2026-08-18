import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { accounts, organizations, profiles, teamspaces } from "./platform.js";

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


