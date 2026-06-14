import { toCatalogLabel, toCatalogSlug } from "@ssota/core";
import { createClient } from "@supabase/supabase-js";
import { and, eq, sql } from "drizzle-orm";
import { createDb } from "../db/client.js";
import * as schema from "../db/schema.js";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "../constants.js";
import { seedHomepageAgentCatalog } from "./seed-homepage-agent.js";

const documentArchetypes = [
  { id: "doc-note", name: "Note", typical: { temporality: "ephemeral", authority: "personal" } },
  { id: "doc-memo", name: "Memo", typical: { temporality: "persistent", authority: "team" } },
  { id: "doc-spec", name: "Spec", typical: { temporality: "persistent", authority: "canonical" } },
  { id: "doc-decision", name: "Decision", typical: { temporality: "persistent", authority: "binding" } },
  { id: "doc-workflow", name: "Workflow", typical: { temporality: "persistent", authority: "canonical" } },
  { id: "doc-reference", name: "Reference", typical: { temporality: "persistent", authority: "external" } },
  { id: "doc-log", name: "Log", typical: { temporality: "append-only", authority: "system" } },
  { id: "doc-template", name: "Template", typical: { temporality: "persistent", authority: "reusable" } },
];

const operationalArchetypes = [
  { id: "op-project", name: "Project", typical: { stateMachine: "project" } },
  { id: "op-task", name: "Task", typical: { stateMachine: "task" } },
  { id: "op-goal", name: "Goal", typical: { stateMachine: "goal" } },
  { id: "op-milestone", name: "Milestone", typical: { stateMachine: "milestone" } },
];

async function seedCatalog(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
) {
  for (const a of [...documentArchetypes, ...operationalArchetypes]) {
    await db
      .insert(schema.archetypes)
      .values({
        id: a.id,
        name: a.name,
        family: a.id.startsWith("doc-") ? "document" : "operational",
        typicalValues: a.typical,
        allowedMutations: ["update_content", "update_properties"],
      })
      .onConflictDoNothing();
  }

  const defaultTransitions = {
    Draft: ["Active", "Archived"],
    Active: ["Archived", "Draft"],
    Archived: ["Active"],
    Deleted: [],
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

  await db
    .insert(schema.nodeCatalog)
    .values([
      {
        projectId,
        nodeType: "Note",
        slug: "note",
        label: "Note",
        family: "document",
        archetypeId: "doc-note",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "Free-form note content",
        propertySchema: titlePropertySchema,
        allowedActionRefs: ["create_node"],
      },
      {
        projectId,
        nodeType: "Document",
        slug: "document",
        label: "Document",
        family: "document",
        archetypeId: "doc-spec",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "Structured document with title and body",
        propertySchema: titlePropertySchema,
        allowedActionRefs: ["create_node", "update_node_properties", "promote_document"],
      },
      {
        projectId,
        nodeType: "Workflow",
        slug: "workflow",
        label: "Workflow",
        family: "document",
        archetypeId: "doc-workflow",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "Agent workflow with trigger patterns",
        propertySchema: titlePropertySchema,
        allowedActionRefs: [],
      },
      {
        projectId,
        nodeType: "Project",
        slug: "project",
        label: "Project",
        family: "operational",
        archetypeId: "op-project",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "Operational project node",
        propertySchema: titleSubjectPropertySchema,
        allowedActionRefs: ["create_node"],
      },
      {
        projectId,
        nodeType: "Task",
        slug: "task",
        label: "Task",
        family: "operational",
        archetypeId: "op-task",
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: "Operational task node",
        propertySchema: titleSubjectPropertySchema,
        allowedActionRefs: ["create_node"],
      },
    ])
    .onConflictDoUpdate({
      target: [schema.nodeCatalog.projectId, schema.nodeCatalog.nodeType],
      set: {
        allowedActionRefs: sql`excluded.allowed_action_refs`,
      },
    });

  await db
    .insert(schema.edgeCatalog)
    .values([
      {
        projectId,
        edgeType: "references",
        slug: "references",
        label: "References",
        domain: ["Document", "Note", "Workflow"],
        range: ["Document", "Note", "Workflow"],
        cardinality: "many-to-many",
        representation: "directed",
      },
      {
        projectId,
        edgeType: "contains",
        slug: "contains",
        label: "Contains",
        domain: ["Project"],
        range: ["Task", "Document"],
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
        actionType: "promote_document",
        preconditions: { requiresExistingNode: true, requiredFields: ["nodeId"] },
        effects: [
          {
            kind: "update_node",
            nodeId: "",
            patch: { lifecycleStatus: "Active" },
          },
        ],
        executor: "Human",
        allowedLifecycleTransitions: { Draft: ["Active"] },
        failureMode: "reject",
        idempotencyRule: null,
        logPayloadSchema: {},
      },
    ];

  const actionCatalogValues = actionCatalogRows.map((row) => ({
    ...row,
    projectId,
    slug: toCatalogSlug(row.actionType),
    label: toCatalogLabel(row.actionType),
    executor: row.executor as "Agent" | "Human" | "System",
  })) as (typeof schema.actionCatalog.$inferInsert)[];

  await db.insert(schema.actionCatalog).values(actionCatalogValues).onConflictDoNothing();

  const permissionRows = [
    ["create_node", "Note", "title"],
    ["create_node", "Document", "title"],
    ["create_node", "Project", "title"],
    ["create_node", "Project", "subject_id"],
    ["create_node", "Task", "title"],
    ["create_node", "Task", "subject_id"],
    ["update_node_properties", "Document", "title"],
  ] as const;

  await db
    .insert(schema.actionPropertyPermissions)
    .values(
      permissionRows.map(([actionType, nodeType, propertyKey]) => ({
        projectId,
        actionType,
        nodeType,
        propertyKey,
        operation: (actionType === "create_node" ? "create" : "write") as
          | "create"
          | "write",
        permissionType: "allow" as const,
        requiresHumanGate: false,
        status: "active",
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(schema.workflows)
    .values(
      DOMAIN_WORKFLOWS.map((row) => workflowSeedRow(projectId, row)),
    )
    .onConflictDoNothing();

  await seedHomepageAgentCatalog(db, projectId);
}

type LegacyWorkflowSeed = (typeof DOMAIN_WORKFLOWS)[number];

function workflowSeedRow(
  projectId: string,
  legacy: LegacyWorkflowSeed,
): typeof schema.workflows.$inferInsert {
  const workflowKey = toCatalogSlug(legacy.title);
  const steps =
    legacy.workflowSteps.length > 0
      ? legacy.workflowSteps.map((step) => ({
          id: step.id,
          title: step.title,
          mode: "agentic" as const,
          actions: step.actionRefs.map((actionType) => ({
            actionType,
            required: false,
          })),
          referenceIds: [] as string[],
          ...("gate" in step && step.gate
            ? {
                gate: {
                  id: `${step.id}_gate`,
                  policy: legacy.gatePolicy,
                  required: true,
                },
              }
            : {}),
        }))
      : [
          {
            id: "execute",
            title: legacy.title,
            mode: "agentic" as const,
            actions: legacy.allowedActions.map((actionType) => ({
              actionType,
              required: false,
            })),
          },
        ];

  return {
    projectId,
    slug: workflowKey,
    workflowKey,
    lifecycle: legacy.lifecycle,
    scope: { kind: "global" },
    spec: {
      title: legacy.title,
      workflowKey,
      lifecycle: legacy.lifecycle,
      scope: { kind: "global" },
      trigger: {
        events:
          legacy.triggerPatterns.length > 0
            ? legacy.triggerPatterns.map((kind, index) => ({
                id: kind === "manual" ? "manual" : `legacy_${index}_${kind}`,
                kind,
                enabled: true,
                config: {},
              }))
            : [{ id: "manual", kind: "manual", enabled: true, config: {} }],
      },
      context: {
        filterGroups: legacy.applicableNodeTypes.map((nodeType, index) => ({
          id: `fg_${nodeType.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${index}`,
          nodeType,
          combinator: "and" as const,
          conditions: [],
        })),
        traversals: [],
        assertions: [],
      },
      conditions: [],
      steps,
      gates: [],
      routes: [],
      references: legacy.body
        ? [
            {
              id: "agent_body",
              title: "Agent notes",
              kind: "inline" as const,
              body: legacy.body,
            },
          ]
        : [],
      output: {
        contract: {},
        completionCriteria: legacy.completionCriteria,
      },
      agentNotes: legacy.body,
      applicableNodeTypes: legacy.applicableNodeTypes.map((nodeType) => ({
        nodeType,
        disabledActions: [],
      })),
      allowedActions: legacy.allowedActions,
    },
  };
}

/** Domain workflows only — Root Runtime Protocol lives in ssota-mcp skill. */
const DOMAIN_WORKFLOWS = [
  {
    title: "Document creation",
    triggerPatterns: [
      "create document",
      "new document",
      "document creation",
    ],
    applicableNodeTypes: ["Document"],
    lifecycle: "Active" as const,
    body: "Create documents as Draft. Include title, content, and provenance. Promote only through Human Gate.",
    workflowSteps: [
      {
        id: "contract",
        title: "Load contract",
        actionRefs: ["create_node"],
      },
      {
        id: "execute",
        title: "Create draft",
        actionRefs: ["create_node"],
      },
    ],
    allowedActions: ["create_node"],
    gatePolicy: { promote: "human_required" },
    completionCriteria: "Document node exists in Draft",
  },
  {
    title: "Document mutation",
    triggerPatterns: [
      "document mutation",
      "edit document",
      "update document",
    ],
    applicableNodeTypes: ["Document"],
    lifecycle: "Active" as const,
    body: "Confirm document mutability and authority before updating. Gate if authority or document kind is unclear. Load target via get_node first.",
    workflowSteps: [],
    allowedActions: ["create_node", "update_node_properties"],
    gatePolicy: { unclear_mutability: "gate" },
    completionCriteria: "Mutation plan recorded or gated",
  },
  {
    title: "Context assembly and retrieval",
    triggerPatterns: [
      "context assembly",
      "retrieval",
      "answering",
      "summarize",
    ],
    applicableNodeTypes: ["Document", "Note", "Project", "Task"],
    lifecycle: "Active" as const,
    body: "Read-only intent. Use query_nodes, get_node, query_neighbors, traverse_graph. Prefer Active authoritative sources.",
    workflowSteps: [],
    allowedActions: [],
    gatePolicy: {},
    completionCriteria: "Answer cites graph context or states gaps",
  },
  {
    title: "Meeting processing and task derivation",
    triggerPatterns: [
      "meeting processing",
      "task derivation",
      "meeting notes",
    ],
    applicableNodeTypes: ["Meeting", "Task", "Note"],
    lifecycle: "Active" as const,
    body: "Extract candidates from meetings. Do not finalize tasks without source provenance. Default new work items to Draft.",
    workflowSteps: [],
    allowedActions: ["create_node"],
    gatePolicy: { finalize_task: "human_required" },
    completionCriteria: "Provenance links meeting to derived work",
  },
  {
    title: "Graph hygiene",
    triggerPatterns: [
      "graph hygiene",
      "deduplication",
      "merge",
      "cleanup",
    ],
    applicableNodeTypes: ["Document", "Task", "Project", "Edge"],
    lifecycle: "Active" as const,
    body: "Identify duplicates and stale items. Auto merge or delete requires Human Gate.",
    workflowSteps: [],
    allowedActions: [],
    gatePolicy: { merge: "always", delete: "always" },
    completionCriteria: "Hygiene proposal recorded or gated",
  },
  {
    title: "Replay and audit",
    triggerPatterns: ["replay", "audit", "provenance", "action log"],
    applicableNodeTypes: ["Document", "Task", "Project"],
    lifecycle: "Active" as const,
    body: "Use get_action_log and get_action_log_entry. Prefer log and provenance over inference.",
    workflowSteps: [],
    allowedActions: [],
    gatePolicy: {},
    completionCriteria: "Audit trail cited in response",
  },
];

async function seedConsole(db: ReturnType<typeof createDb>["db"], smokeUserId?: string) {
  const [org] = await db
    .insert(schema.organizations)
    .values({
      slug: DEFAULT_ORG_SLUG,
      name: "SSOTA Labs",
    })
    .onConflictDoNothing()
    .returning();

  let organizationId = org?.id;
  if (!organizationId) {
    const existing = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, DEFAULT_ORG_SLUG))
      .limit(1);
    organizationId = existing[0]?.id;
  }
  if (!organizationId) return;

  await db
    .insert(schema.projects)
    .values({
      organizationId,
      slug: DEFAULT_PROJECT_SLUG,
      name: "SSOTA Dev",
    })
    .onConflictDoNothing();

  if (smokeUserId) {
    await db
      .insert(schema.profiles)
      .values({
        id: smokeUserId,
        email: SMOKE_EMAIL,
        displayName: "Smoke Operator",
        onboardingStep: "completed",
        onboardingCompletedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.profiles.id,
        set: {
          email: SMOKE_EMAIL,
          displayName: "Smoke Operator",
          onboardingStep: "completed",
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    await db
      .update(schema.organizations)
      .set({ ownerUserId: smokeUserId })
      .where(eq(schema.organizations.id, organizationId));

    await db
      .insert(schema.organizationMemberships)
      .values({
        organizationId,
        userId: smokeUserId,
        role: "admin",
      })
      .onConflictDoNothing();

    await db
      .insert(schema.userProjectPreferences)
      .values({
        userId: smokeUserId,
        orgSlug: DEFAULT_ORG_SLUG,
        projectSlug: DEFAULT_PROJECT_SLUG,
      })
      .onConflictDoUpdate({
        target: schema.userProjectPreferences.userId,
        set: {
          orgSlug: DEFAULT_ORG_SLUG,
          projectSlug: DEFAULT_PROJECT_SLUG,
          updatedAt: new Date(),
        },
      });
  }
}

async function seedSmokeUser() {
  const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin.auth.admin.listUsers();
  const smokeUser = existing?.users?.find((u) => u.email === SMOKE_EMAIL);

  if (!smokeUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: SMOKE_EMAIL,
      password: SMOKE_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Created smoke user: ${SMOKE_EMAIL}`);
    return data.user?.id;
  }
  console.log(`Smoke user already exists: ${SMOKE_EMAIL}`);
  return smokeUser.id;
}

async function resolveDefaultProjectId(
  db: ReturnType<typeof createDb>["db"],
): Promise<string> {
  const orgRows = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, DEFAULT_ORG_SLUG))
    .limit(1);
  const organizationId = orgRows[0]?.id;
  if (!organizationId) {
    throw new Error(`Organization not found: ${DEFAULT_ORG_SLUG}`);
  }

  const projectRows = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.organizationId, organizationId),
        eq(schema.projects.slug, DEFAULT_PROJECT_SLUG),
      ),
    )
    .limit(1);
  const projectId = projectRows[0]?.id;
  if (!projectId) {
    throw new Error(`Project not found: ${DEFAULT_PROJECT_SLUG}`);
  }
  return projectId;
}

async function main() {
  const { db, client } = createDb();
  console.log("Seeding smoke user...");
  const smokeUserId = await seedSmokeUser();
  console.log("Seeding console org/project...");
  await seedConsole(db, smokeUserId);
  const projectId = await resolveDefaultProjectId(db);
  console.log("Seeding catalog...");
  await seedCatalog(db, projectId);
  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
