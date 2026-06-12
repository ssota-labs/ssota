/**
 * SSOTA-on-SSOTA 운영단 카탈로그 시드.
 * ssota-dev 프로젝트에 Objective~Release 노드·엣지·프로퍼티·create 액션을 등록한다.
 * 기본 seed(db:seed) 이후 실행: pnpm db:seed:ops
 */
import { toCatalogLabel, toCatalogSlug } from "@ssota/core";
import { and, eq } from "drizzle-orm";
import { createDb } from "../db/client.js";
import * as schema from "../db/schema.js";
import { DEFAULT_ORG_SLUG, DEFAULT_PROJECT_SLUG } from "../constants.js";

const defaultTransitions = {
  Draft: ["Active", "Archived"],
  Active: ["Archived", "Draft"],
  Archived: ["Active"],
  Deleted: [],
};

const operationalArchetypes = [
  { id: "op-objective", name: "Objective", typical: { stateMachine: "goal" } },
  { id: "op-key-result", name: "KeyResult", typical: { stateMachine: "milestone" } },
  { id: "op-kpi", name: "KPI", typical: { stateMachine: "metric" } },
  { id: "op-metric-snapshot", name: "MetricSnapshot", typical: { stateMachine: "log" } },
  { id: "op-sprint", name: "Sprint", typical: { stateMachine: "milestone" } },
  { id: "op-feature", name: "Feature", typical: { stateMachine: "project" } },
  { id: "op-actor", name: "Actor", typical: { stateMachine: "reference" } },
  { id: "op-pull-request", name: "PullRequest", typical: { stateMachine: "task" } },
  { id: "op-release", name: "Release", typical: { stateMachine: "milestone" } },
] as const;

const operationalNodeTypes = [
  {
    nodeType: "Objective",
    archetypeId: "op-objective",
    contentGuide: "OKR Objective — 질적 변화 목표 (기간·방향성)",
    propertyRefs: ["title", "summary", "period", "confidence", "status"],
  },
  {
    nodeType: "KeyResult",
    archetypeId: "op-key-result",
    contentGuide: "OKR Key Result — Objective 달성을 검증하는 정량 결과",
    propertyRefs: ["title", "metric_name", "target_value", "current_value", "unit", "status"],
  },
  {
    nodeType: "KPI",
    archetypeId: "op-kpi",
    contentGuide: "지속 추적 운영 건강 지표",
    propertyRefs: ["title", "metric_name", "unit", "status"],
  },
  {
    nodeType: "MetricSnapshot",
    archetypeId: "op-metric-snapshot",
    contentGuide: "KR/KPI의 특정 시점 측정값",
    propertyRefs: ["title", "value", "measured_at"],
  },
  {
    nodeType: "Sprint",
    archetypeId: "op-sprint",
    contentGuide: "1~2주 실행 사이클",
    propertyRefs: ["title", "sprint_number", "sprint_goal", "status"],
  },
  {
    nodeType: "Feature",
    archetypeId: "op-feature",
    contentGuide: "사용자가 체감하는 제품/시스템 능력 단위",
    propertyRefs: ["title", "summary", "user_value", "priority", "acceptance_criteria", "status"],
  },
  {
    nodeType: "Actor",
    archetypeId: "op-actor",
    contentGuide: "책임 주체 — Human / Team / Agent / System",
    propertyRefs: ["name", "actor_type", "role", "status"],
  },
  {
    nodeType: "PullRequest",
    archetypeId: "op-pull-request",
    contentGuide: "코드 변경 리뷰·병합 단위",
    propertyRefs: ["title", "pr_url", "branch_name", "status"],
  },
  {
    nodeType: "Release",
    archetypeId: "op-release",
    contentGuide: "배포·출시 묶음",
    propertyRefs: ["title", "version", "environment", "release_type", "status"],
  },
] as const;

const operationalEdgeTypes = [
  { edgeType: "measured_by", domain: ["Objective"], range: ["KeyResult"], cardinality: "one-to-many" },
  { edgeType: "tracked_by", domain: ["KeyResult"], range: ["KPI"], cardinality: "many-to-many" },
  { edgeType: "has_snapshot", domain: ["KeyResult", "KPI"], range: ["MetricSnapshot"], cardinality: "one-to-many" },
  { edgeType: "contributes_to", domain: ["Project", "Feature"], range: ["Objective", "KeyResult"], cardinality: "many-to-many" },
  { edgeType: "belongs_to", domain: ["Sprint", "Feature"], range: ["Project"], cardinality: "many-to-one" },
  { edgeType: "contains", domain: ["Project"], range: ["Sprint", "Feature"], cardinality: "one-to-many" },
  { edgeType: "plans", domain: ["Sprint"], range: ["Task"], cardinality: "one-to-many" },
  { edgeType: "decomposes_into", domain: ["Feature"], range: ["Task"], cardinality: "one-to-many" },
  { edgeType: "implements", domain: ["Task", "PullRequest"], range: ["Feature"], cardinality: "many-to-one" },
  { edgeType: "assigned_to", domain: ["Task", "PullRequest"], range: ["Actor"], cardinality: "many-to-one" },
  { edgeType: "accountable_to", domain: ["Feature", "Project", "Objective"], range: ["Actor"], cardinality: "many-to-one" },
  { edgeType: "reviewed_by", domain: ["PullRequest", "Document"], range: ["Actor"], cardinality: "many-to-many" },
  { edgeType: "approved_by", domain: ["Release"], range: ["Actor"], cardinality: "many-to-one" },
  { edgeType: "owned_by", domain: ["Document", "Objective", "Project"], range: ["Actor"], cardinality: "many-to-one" },
  { edgeType: "specified_by", domain: ["Feature"], range: ["Document"], cardinality: "many-to-many" },
  { edgeType: "ships_in", domain: ["Feature", "PullRequest"], range: ["Release"], cardinality: "many-to-one" },
  { edgeType: "includes", domain: ["Release"], range: ["Feature", "PullRequest"], cardinality: "one-to-many" },
  { edgeType: "produces", domain: ["Task"], range: ["PullRequest", "Document"], cardinality: "one-to-many" },
  { edgeType: "depends_on", domain: ["Task"], range: ["Task"], cardinality: "many-to-many" },
  { edgeType: "derived_from", domain: ["Task", "KeyResult"], range: ["Document", "Meeting"], cardinality: "many-to-many" },
] as const;

const operationalProperties = [
  { propertyKey: "summary", valueType: "string" as const, constraints: { maxLength: 2000 } },
  { propertyKey: "period", valueType: "string" as const, constraints: { maxLength: 100 } },
  { propertyKey: "confidence", valueType: "number" as const, constraints: { minimum: 0, maximum: 1 } },
  { propertyKey: "status", valueType: "string" as const, constraints: { maxLength: 50 } },
  { propertyKey: "metric_name", valueType: "string" as const, constraints: { maxLength: 200 } },
  { propertyKey: "target_value", valueType: "number" as const, constraints: {} },
  { propertyKey: "current_value", valueType: "number" as const, constraints: {} },
  { propertyKey: "unit", valueType: "string" as const, constraints: { maxLength: 50 } },
  { propertyKey: "value", valueType: "number" as const, constraints: {} },
  { propertyKey: "measured_at", valueType: "string" as const, constraints: { maxLength: 50 } },
  { propertyKey: "sprint_number", valueType: "number" as const, constraints: {} },
  { propertyKey: "sprint_goal", valueType: "string" as const, constraints: { maxLength: 500 } },
  { propertyKey: "user_value", valueType: "string" as const, constraints: { maxLength: 1000 } },
  { propertyKey: "priority", valueType: "string" as const, constraints: { maxLength: 20 } },
  { propertyKey: "acceptance_criteria", valueType: "string" as const, constraints: { maxLength: 2000 } },
  { propertyKey: "estimate", valueType: "string" as const, constraints: { maxLength: 50 } },
  { propertyKey: "name", valueType: "string" as const, constraints: { maxLength: 200 } },
  { propertyKey: "actor_type", valueType: "string" as const, constraints: { maxLength: 20 } },
  { propertyKey: "role", valueType: "string" as const, constraints: { maxLength: 100 } },
  { propertyKey: "pr_url", valueType: "string" as const, constraints: { maxLength: 500 } },
  { propertyKey: "branch_name", valueType: "string" as const, constraints: { maxLength: 200 } },
  { propertyKey: "version", valueType: "string" as const, constraints: { maxLength: 50 } },
  { propertyKey: "environment", valueType: "string" as const, constraints: { maxLength: 50 } },
  { propertyKey: "release_type", valueType: "string" as const, constraints: { maxLength: 50 } },
] as const;

function createNodeEffect(nodeType: string, requiredProps: string[]) {
  return {
    actionType: `create_${toCatalogSlug(nodeType).replace(/-/g, "_")}`,
    preconditions: { requiredFields: requiredProps },
    effects: [
      {
        kind: "create_node" as const,
        node: {
          nodeType,
          lifecycleStatus: "Draft" as const,
          properties: {},
          content: null,
          provenance: {},
        },
      },
    ],
    executor: "Agent" as const,
    allowedLifecycleTransitions: {},
    failureMode: "reject" as const,
    idempotencyRule: "key" as const,
    logPayloadSchema: {},
  };
}

const createActions = [
  createNodeEffect("Objective", ["title"]),
  createNodeEffect("KeyResult", ["title", "metric_name"]),
  createNodeEffect("KPI", ["title", "metric_name"]),
  createNodeEffect("MetricSnapshot", ["value", "measured_at"]),
  createNodeEffect("Sprint", ["title", "sprint_goal"]),
  createNodeEffect("Feature", ["title"]),
  createNodeEffect("Actor", ["name", "actor_type"]),
  createNodeEffect("PullRequest", ["title", "pr_url"]),
  createNodeEffect("Release", ["title", "version"]),
];

async function mergeOwningActions(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
  propertyKey: string,
  actions: string[],
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.propertyCatalog)
    .where(
      and(
        eq(schema.propertyCatalog.propertyKey, propertyKey),
        eq(schema.propertyCatalog.projectId, projectId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return;
  const merged = [...new Set([...(row.owningActions as string[]), ...actions])];
  await db
    .update(schema.propertyCatalog)
    .set({ owningActions: merged })
    .where(
      and(
        eq(schema.propertyCatalog.propertyKey, propertyKey),
        eq(schema.propertyCatalog.projectId, projectId),
      ),
    );
}

async function resolveProjectId(db: ReturnType<typeof createDb>["db"]): Promise<string> {
  const orgRows = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, DEFAULT_ORG_SLUG))
    .limit(1);
  const organizationId = orgRows[0]?.id;
  if (!organizationId) throw new Error(`Organization not found: ${DEFAULT_ORG_SLUG}`);

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
  if (!projectId) throw new Error(`Project not found: ${DEFAULT_PROJECT_SLUG}`);
  return projectId;
}

async function main() {
  const { db, client } = createDb();
  const projectId = await resolveProjectId(db);
  console.log(`Seeding operational catalog for project ${DEFAULT_PROJECT_SLUG} (${projectId})`);

  for (const a of operationalArchetypes) {
    await db
      .insert(schema.archetypes)
      .values({
        id: a.id,
        name: a.name,
        family: "operational",
        typicalValues: a.typical,
        allowedMutations: ["update_content", "update_properties"],
      })
      .onConflictDoNothing();
  }

  await db
    .insert(schema.nodeCatalog)
    .values(
      operationalNodeTypes.map((row) => ({
        projectId,
        nodeType: row.nodeType,
        slug: toCatalogSlug(row.nodeType),
        label: toCatalogLabel(row.nodeType),
        family: "operational" as const,
        archetypeId: row.archetypeId,
        typicalValueOverrides: {},
        lifecycleTransitions: defaultTransitions,
        contentGuide: row.contentGuide,
        propertyRefs: [...row.propertyRefs],
        allowedActionRefs: [],
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(schema.edgeCatalog)
    .values(
      operationalEdgeTypes.map((row) => ({
        projectId,
        edgeType: row.edgeType,
        slug: toCatalogSlug(row.edgeType),
        label: toCatalogLabel(row.edgeType),
        domain: [...row.domain],
        range: [...row.range],
        cardinality: row.cardinality,
        representation: "directed",
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(schema.propertyCatalog)
    .values(
      operationalProperties.map((row) => ({
        projectId,
        propertyKey: row.propertyKey,
        valueType: row.valueType,
        constraints: row.constraints,
        owningActions: [],
      })),
    )
    .onConflictDoNothing();

  const actionRows = createActions.map((row) => ({
    ...row,
    projectId,
    slug: toCatalogSlug(row.actionType),
    label: toCatalogLabel(row.actionType),
  })) as (typeof schema.actionCatalog.$inferInsert)[];

  await db.insert(schema.actionCatalog).values(actionRows).onConflictDoNothing();

  const permissionRows: Array<[string, string, string]> = [];
  for (const action of createActions) {
    const nodeType = action.effects[0]?.kind === "create_node"
      ? (action.effects[0].node as { nodeType: string }).nodeType
      : null;
    if (!nodeType) continue;
    for (const field of action.preconditions.requiredFields ?? []) {
      permissionRows.push([action.actionType, nodeType, field]);
    }
  }

  if (permissionRows.length > 0) {
    await db
      .insert(schema.actionPropertyPermissions)
      .values(
        permissionRows.map(([actionType, nodeType, propertyKey]) => ({
          projectId,
          actionType,
          nodeType,
          propertyKey,
          operation: "write" as const,
          permissionType: "allow" as const,
          requiresHumanGate: false,
          status: "active",
        })),
      )
      .onConflictDoNothing();
  }

  const titleOwningActions = createActions
    .filter((action) => action.preconditions.requiredFields?.includes("title"))
    .map((action) => action.actionType);
  if (titleOwningActions.length > 0) {
    await mergeOwningActions(db, projectId, "title", titleOwningActions);
  }

  console.log("Operational catalog seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
