import { toCatalogLabel, toCatalogSlug } from "@ssota/core";
import { eq } from "drizzle-orm";
import type { createDb } from "../db/client.js";
import * as schema from "../db/schema.js";

type Db = ReturnType<typeof createDb>["db"];

const defaultTransitions = {
  Draft: ["Active", "Archived"],
  Active: ["Archived", "Draft"],
  Archived: ["Active"],
  Deleted: [] as string[],
};

async function mergeOwningActions(
  db: Db,
  propertyKey: string,
  actions: string[],
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.propertyCatalog)
    .where(eq(schema.propertyCatalog.propertyKey, propertyKey))
    .limit(1);
  const row = rows[0];
  if (!row) return;
  const merged = [...new Set([...(row.owningActions as string[]), ...actions])];
  await db
    .update(schema.propertyCatalog)
    .set({ owningActions: merged })
    .where(eq(schema.propertyCatalog.propertyKey, propertyKey));
}

/** 홈페이지 제작 에이전트 버티컬 카탈로그 — 고객사 A가 세팅하는 스키마 예시 */
export async function seedHomepageAgentCatalog(db: Db): Promise<void> {
  await db
    .insert(schema.nodeCatalog)
    .values([
      {
        nodeType: "HomepageProject",
        slug: toCatalogSlug("HomepageProject"),
        label: toCatalogLabel("HomepageProject"),
        family: "operational",
        archetypeId: "op-project",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "End-customer homepage engagement root",
        propertyRefs: ["title", "subject_id"],
        allowedActionRefs: [
          "create_homepage_project",
          "create_design_brief",
          "create_page_section",
          "link_homepage_contains",
        ],
      },
      {
        nodeType: "DesignBrief",
        slug: toCatalogSlug("DesignBrief"),
        label: toCatalogLabel("DesignBrief"),
        family: "document",
        archetypeId: "doc-spec",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "Goals, audience, and constraints for the homepage",
        propertyRefs: ["title", "subject_id"],
        allowedActionRefs: ["create_design_brief", "link_homepage_contains"],
      },
      {
        nodeType: "PageSection",
        slug: toCatalogSlug("PageSection"),
        label: toCatalogLabel("PageSection"),
        family: "document",
        archetypeId: "doc-spec",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "A single homepage section (hero, features, CTA, etc.)",
        propertyRefs: ["title", "subject_id", "section_key"],
        allowedActionRefs: ["create_page_section", "link_homepage_contains"],
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.edgeCatalog)
    .values([
      {
        edgeType: "homepage_contains",
        slug: toCatalogSlug("homepage_contains"),
        label: toCatalogLabel("homepage_contains"),
        domain: ["HomepageProject"],
        range: ["DesignBrief", "PageSection"],
        cardinality: "one-to-many",
        representation: "directed",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.propertyCatalog)
    .values([
      {
        propertyKey: "section_key",
        valueType: "string",
        constraints: { maxLength: 100 },
        owningActions: ["create_page_section"],
      },
    ])
    .onConflictDoNothing();

  await mergeOwningActions(db, "subject_id", [
    "create_homepage_project",
    "create_design_brief",
    "create_page_section",
  ]);
  await mergeOwningActions(db, "title", [
    "create_homepage_project",
    "create_design_brief",
    "create_page_section",
  ]);

  const actionCatalogRows = [
      {
        actionType: "create_homepage_project",
        scope: { kind: "node_type", nodeType: "HomepageProject" },
        preconditions: { requiredFields: ["title"] },
        effects: [
          {
            kind: "create_node",
            node: {
              nodeType: "HomepageProject",
              lifecycleStatus: "Draft",
              properties: {},
              content: null,
              provenance: {},
            },
          },
        ],
        executor: "Agent",
        allowedLifecycleTransitions: {},
        failureMode: "reject",
        idempotencyRule: "key",
        logPayloadSchema: {},
      },
      {
        actionType: "create_design_brief",
        scope: { kind: "node_type", nodeType: "DesignBrief" },
        preconditions: { requiredFields: ["title", "content"] },
        effects: [
          {
            kind: "create_node",
            node: {
              nodeType: "DesignBrief",
              lifecycleStatus: "Draft",
              properties: {},
              content: null,
              provenance: {},
            },
          },
        ],
        executor: "Agent",
        allowedLifecycleTransitions: {},
        failureMode: "reject",
        idempotencyRule: "key",
        logPayloadSchema: {},
      },
      {
        actionType: "create_page_section",
        scope: { kind: "node_type", nodeType: "PageSection" },
        preconditions: { requiredFields: ["title", "properties.section_key"] },
        effects: [
          {
            kind: "create_node",
            node: {
              nodeType: "PageSection",
              lifecycleStatus: "Draft",
              properties: {},
              content: null,
              provenance: {},
            },
          },
        ],
        executor: "Agent",
        allowedLifecycleTransitions: {},
        failureMode: "reject",
        idempotencyRule: "key",
        logPayloadSchema: {},
      },
      {
        actionType: "link_homepage_contains",
        scope: { kind: "edge_type", edgeType: "homepage_contains" },
        preconditions: {
          requiresExistingNode: true,
          requiredFields: ["sourceNodeId", "targetNodeId"],
        },
        effects: [
          {
            kind: "create_edge",
            edge: {
              edgeType: "homepage_contains",
              sourceNodeId: "",
              targetNodeId: "",
              properties: {},
            },
          },
        ],
        executor: "Agent",
        allowedLifecycleTransitions: {},
        failureMode: "reject",
        idempotencyRule: "key",
        logPayloadSchema: {},
      },
    ];

  await db
    .insert(schema.actionCatalog)
    .values(
      actionCatalogRows.map((row) => ({
        ...row,
        slug: toCatalogSlug(row.actionType),
        label: toCatalogLabel(row.actionType),
        executor: row.executor as "Agent" | "Human" | "System",
      })) as (typeof schema.actionCatalog.$inferInsert)[],
    )
    .onConflictDoNothing();

  const permissionRows = [
    ["create_homepage_project", "HomepageProject", "title"],
    ["create_homepage_project", "HomepageProject", "subject_id"],
    ["create_design_brief", "DesignBrief", "title"],
    ["create_design_brief", "DesignBrief", "subject_id"],
    ["create_page_section", "PageSection", "title"],
    ["create_page_section", "PageSection", "subject_id"],
    ["create_page_section", "PageSection", "section_key"],
  ] as const;

  for (const [actionType, nodeType, propertyKey] of permissionRows) {
    await db
      .insert(schema.actionPropertyPermissions)
      .values({
        actionType,
        nodeType,
        propertyKey,
        operation: "write",
        permissionType: "allow",
        requiresHumanGate: false,
        status: "active",
      })
      .onConflictDoNothing();
  }

  await db
    .insert(schema.instructions)
    .values([
      {
        title: "Homepage creation workflow",
        slug: toCatalogSlug("Homepage creation workflow"),
        triggerPatterns: [
          "create homepage",
          "new homepage project",
          "homepage design",
        ],
        applicableNodeTypes: [
          "HomepageProject",
          "DesignBrief",
          "PageSection",
        ],
        requiredActions: [
          "create_homepage_project",
          "create_design_brief",
          "link_homepage_contains",
        ],
        optionalActions: ["create_page_section"],
        lifecycle: "Active",
        body: [
          "1. create_homepage_project with a title for the engagement.",
          "2. create_design_brief with title + content (goals, audience, tone).",
          "3. link_homepage_contains from the HomepageProject to the DesignBrief.",
          "4. Optionally create_page_section nodes and link them to the project.",
          "All instance nodes are scoped by subject_id from the embedder context.",
        ].join("\n"),
        workflowSteps: [
          {
            id: "open_project",
            title: "Open homepage project",
            actionRefs: ["create_homepage_project"],
          },
          {
            id: "capture_brief",
            title: "Capture design brief",
            actionRefs: ["create_design_brief"],
          },
          {
            id: "link_brief",
            title: "Link brief to project",
            actionRefs: ["link_homepage_contains"],
          },
        ],
        allowedActions: [
          "create_homepage_project",
          "create_design_brief",
          "create_page_section",
          "link_homepage_contains",
        ],
      },
    ])
    .onConflictDoNothing();
}
