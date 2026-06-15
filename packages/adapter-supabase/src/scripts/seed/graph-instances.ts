import type { NodeType } from "@ssota/contracts";
import { and, eq } from "drizzle-orm";
import type { createDb } from "../../db/client.js";
import * as schema from "../../db/schema.js";

/** One evergreen container per project — dev track (Console v2.7). */
export const EVERGREEN_DEV_SINGLETON_TYPES = [
  "product_roadmap",
  "data_spec",
  "architecture_spec",
  "api_reference",
  "integration_spec",
] as const satisfies readonly NodeType[];

/** One evergreen container per project — design track (Console v2.7). */
export const EVERGREEN_DESIGN_SINGLETON_TYPES = [
  "information_architecture",
  "ui_component_catalog",
  "design_theme",
  "page_wireframe",
] as const satisfies readonly NodeType[];

/** Executive planning singletons. */
export const EXECUTIVE_SINGLETON_TYPES = [
  "objective",
  "kpi",
] as const satisfies readonly NodeType[];

const GRAPH_SEED_IDEMPOTENCY_PREFIX = "seed:graph:";

export async function seedGraphInstances(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
) {
  const singletonTypes = [
    ...EVERGREEN_DEV_SINGLETON_TYPES,
    ...EVERGREEN_DESIGN_SINGLETON_TYPES,
    ...EXECUTIVE_SINGLETON_TYPES,
  ];

  for (const nodeType of singletonTypes) {
    const existing = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.projectId, projectId),
          eq(schema.nodes.nodeType, nodeType),
        ),
      )
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(schema.nodes).values({
      projectId,
      nodeType,
      title: "",
      properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${nodeType}` },
      lifecycleStatus: "Draft",
      schemaVersion: 1,
    });
  }

  await migrateLegacyRoadmapSingletons(db, projectId);

  const hypothesisExisting = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeType, "hypothesis"),
      ),
    )
    .limit(1);

  let hypothesisId = hypothesisExisting[0]?.id;
  if (!hypothesisId) {
    const [hypothesis] = await db
      .insert(schema.nodes)
      .values({
        projectId,
        nodeType: "hypothesis",
        title: "Smoke hypothesis",
        properties: {
          status: "draft",
          summary: "Seed hypothesis for integration and E2E",
          seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}hypothesis`,
        },
        lifecycleStatus: "Draft",
      })
      .returning({ id: schema.nodes.id });
    hypothesisId = hypothesis?.id;
  }

  const bundleExisting = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeType, "initiative"),
        eq(schema.nodes.title, "Smoke initiative"),
      ),
    )
    .limit(1);

  if (bundleExisting.length === 0) {
    const [initiative] = await db
      .insert(schema.nodes)
      .values({
        projectId,
        nodeType: "initiative",
        title: "Smoke initiative",
        properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}initiative` },
        lifecycleStatus: "Draft",
      })
      .returning({ id: schema.nodes.id });

    const [release] = await db
      .insert(schema.nodes)
      .values({
        projectId,
        nodeType: "release",
        title: "v0.0.0-smoke",
        properties: {
          version: "0.0.0-smoke",
          seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}release`,
        },
        lifecycleStatus: "Draft",
      })
      .returning({ id: schema.nodes.id });

    if (initiative?.id && release?.id) {
      await db.insert(schema.edges).values({
        projectId,
        edgeType: "paired_with",
        sourceNodeId: initiative.id,
        targetNodeId: release.id,
        properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}paired_with` },
      });

      await seedInitiativeScopedNodes(db, projectId, initiative.id);
    }
  } else if (bundleExisting[0]?.id) {
    await seedInitiativeScopedNodes(db, projectId, bundleExisting[0].id);
  }

  return { hypothesisId };
}

/** Legacy executive roadmap was a singleton without kind/year — remove on re-seed. */
async function migrateLegacyRoadmapSingletons(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
) {
  const legacyRows = await db
    .select({
      id: schema.nodes.id,
      properties: schema.nodes.properties,
    })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeType, "roadmap"),
      ),
    );

  for (const row of legacyRows) {
    const props = row.properties as Record<string, unknown>;
    if (typeof props.kind === "string" && typeof props.year === "number") {
      continue;
    }
    await db.delete(schema.nodes).where(eq(schema.nodes.id, row.id));
  }
}

async function seedInitiativeScopedNodes(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
  initiativeId: string,
) {
  const scopedSeeds = [
    { nodeType: "prd" as const, title: "Smoke PRD" },
    { nodeType: "feature" as const, title: "Smoke feature" },
  ];

  for (const seed of scopedSeeds) {
    const existing = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.projectId, projectId),
          eq(schema.nodes.nodeType, seed.nodeType),
          eq(schema.nodes.title, seed.title),
        ),
      )
      .limit(1);

    let nodeId = existing[0]?.id;
    if (!nodeId) {
      const [row] = await db
        .insert(schema.nodes)
        .values({
          projectId,
          nodeType: seed.nodeType,
          title: seed.title,
          properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${seed.nodeType}` },
          lifecycleStatus: "Draft",
        })
        .returning({ id: schema.nodes.id });
      nodeId = row?.id;
    }

    if (!nodeId) continue;

    const edgeExisting = await db
      .select({ id: schema.edges.id })
      .from(schema.edges)
      .where(
        and(
          eq(schema.edges.projectId, projectId),
          eq(schema.edges.edgeType, "for_initiative"),
          eq(schema.edges.sourceNodeId, nodeId),
          eq(schema.edges.targetNodeId, initiativeId),
        ),
      )
      .limit(1);

    if (edgeExisting.length === 0) {
      await db.insert(schema.edges).values({
        projectId,
        edgeType: "for_initiative",
        sourceNodeId: nodeId,
        targetNodeId: initiativeId,
        properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}for_initiative` },
      });
    }
  }
}
