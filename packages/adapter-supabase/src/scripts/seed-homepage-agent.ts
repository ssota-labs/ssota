import { toCatalogLabel, toCatalogSlug } from "@ssota/core";
import type { createDb } from "../db/client.js";
import * as schema from "../db/schema.js";

type Db = ReturnType<typeof createDb>["db"];

const defaultTransitions = {
  Draft: ["Active", "Archived"],
  Active: ["Archived", "Draft"],
  Archived: ["Active"],
  Deleted: [] as string[],
};

const titlePropertySchema = {
  title: {
    valueType: "string",
    constraints: { minLength: 1, maxLength: 500 },
    required: true,
    system: true,
  },
};

const titleSubjectPropertySchema = {
  ...titlePropertySchema,
  subject_id: {
    valueType: "string",
    constraints: { minLength: 1 },
    required: true,
  },
};

const pageSectionPropertySchema = {
  ...titleSubjectPropertySchema,
  section_key: {
    valueType: "string",
    constraints: { maxLength: 100 },
    required: true,
  },
};

/** 홈페이지 제작 에이전트 버티컬 카탈로그 — 고객사 A가 세팅하는 스키마 예시 */
export async function seedHomepageAgentCatalog(
  db: Db,
  projectId: string,
): Promise<void> {
  await db
    .insert(schema.nodeCatalog)
    .values([
      {
        projectId,
        nodeType: "HomepageProject",
        slug: toCatalogSlug("HomepageProject"),
        label: toCatalogLabel("HomepageProject"),
        family: "operational",
        archetypeId: "op-project",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "End-customer homepage engagement root",
        propertySchema: titleSubjectPropertySchema,
        allowedActionRefs: ["create_node", "link_homepage_contains"],
      },
      {
        projectId,
        nodeType: "DesignBrief",
        slug: toCatalogSlug("DesignBrief"),
        label: toCatalogLabel("DesignBrief"),
        family: "document",
        archetypeId: "doc-spec",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "Goals, audience, and constraints for the homepage",
        propertySchema: titleSubjectPropertySchema,
        allowedActionRefs: ["create_node", "link_homepage_contains"],
      },
      {
        projectId,
        nodeType: "PageSection",
        slug: toCatalogSlug("PageSection"),
        label: toCatalogLabel("PageSection"),
        family: "document",
        archetypeId: "doc-spec",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "A single homepage section (hero, features, CTA, etc.)",
        propertySchema: pageSectionPropertySchema,
        allowedActionRefs: ["create_node", "link_homepage_contains"],
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.edgeCatalog)
    .values([
      {
        projectId,
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

  const actionCatalogRows = [
    {
      actionType: "create_node",
      preconditions: { requiredFields: ["nodeType"] },
      effects: [
        {
          kind: "create_node",
          node: {
            nodeType: "",
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
      idempotencyRule: null,
      logPayloadSchema: {},
    },
    {
      actionType: "update_node_properties",
      preconditions: {
        requiredFields: ["nodeId", "properties"],
        requiresExistingNode: true,
      },
      effects: [
        {
          kind: "update_node",
          nodeId: "",
          patch: { properties: {} },
        },
      ],
      executor: "Agent",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
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
        projectId,
        slug: toCatalogSlug(row.actionType),
        label: toCatalogLabel(row.actionType),
        executor: row.executor as "Agent" | "Human" | "System",
      })) as (typeof schema.actionCatalog.$inferInsert)[],
    )
    .onConflictDoNothing();

  const permissionRows = [
    ["create_node", "HomepageProject", "title"],
    ["create_node", "HomepageProject", "subject_id"],
    ["create_node", "DesignBrief", "title"],
    ["create_node", "DesignBrief", "subject_id"],
    ["create_node", "PageSection", "title"],
    ["create_node", "PageSection", "subject_id"],
    ["create_node", "PageSection", "section_key"],
  ] as const;

  for (const [actionType, nodeType, propertyKey] of permissionRows) {
    await db
      .insert(schema.actionPropertyPermissions)
      .values({
        projectId,
        actionType,
        nodeType,
        propertyKey,
        operation: "create",
        permissionType: "allow",
        requiresHumanGate: false,
        status: "active",
      })
      .onConflictDoNothing();
  }

  await db
    .insert(schema.workflows)
    .values([
      {
        projectId,
        slug: toCatalogSlug("Homepage creation workflow"),
        workflowKey: "homepage_creation",
        lifecycle: "Active",
        scope: { kind: "global" },
        spec: {
          title: "Homepage creation workflow",
          workflowKey: "homepage_creation",
          lifecycle: "Active",
          scope: { kind: "global" },
          trigger: {
            events: [
              { id: "manual", kind: "manual", enabled: true, config: {} },
              {
                id: "create_homepage",
                kind: "create_homepage",
                enabled: true,
                config: {},
              },
              {
                id: "new_homepage_project",
                kind: "new_homepage_project",
                enabled: true,
                config: {},
              },
              {
                id: "homepage_design",
                kind: "homepage_design",
                enabled: true,
                config: {},
              },
            ],
          },
          context: { queries: [], traversals: [], assertions: [] },
          conditions: [],
          steps: [
            {
              id: "open_project",
              title: "Open homepage project",
              mode: "agentic",
              actions: [{ actionType: "create_node", required: false }],
            },
            {
              id: "capture_brief",
              title: "Capture design brief",
              mode: "agentic",
              actions: [{ actionType: "create_node", required: false }],
            },
            {
              id: "link_brief",
              title: "Link brief to project",
              mode: "agentic",
              actions: [{ actionType: "link_homepage_contains", required: false }],
            },
          ],
          gates: [],
          routes: [],
          references: [],
          output: { contract: {} },
          agentNotes: [
            "1. create_node with nodeType HomepageProject and a title.",
            "2. create_node with nodeType DesignBrief, title + content (goals, audience, tone).",
            "3. link_homepage_contains from the HomepageProject to the DesignBrief.",
            "4. Optionally create_node PageSection nodes and link them to the project.",
            "All instance nodes are scoped by subject_id from the embedder context.",
          ].join("\n"),
          applicableNodeTypes: [
            "HomepageProject",
            "DesignBrief",
            "PageSection",
          ],
          allowedActions: ["create_node", "link_homepage_contains"],
          requiredActions: ["create_node", "link_homepage_contains"],
          optionalActions: ["create_node"],
        },
      },
    ])
    .onConflictDoNothing();
}
