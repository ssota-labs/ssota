import type { NodeType } from "@ssota/contracts";
import { and, eq } from "drizzle-orm";
import type { createDb } from "../../db/client.js";
import * as schema from "../../db/schema.js";

/** One evergreen container per project — dev track (Console v2.7). */
export const EVERGREEN_DEV_SINGLETON_TYPES = [
  "product_roadmap",
  "roadmap",
  "architecture_spec",
  "api_reference",
] as const satisfies readonly NodeType[];

/** One evergreen container per project — design track (Console v2.7). */
export const EVERGREEN_DESIGN_SINGLETON_TYPES = [
  "ui_component_catalog",
  "design_theme",
  "page_wireframe",
] as const satisfies readonly NodeType[];

const GRAPH_SEED_IDEMPOTENCY_PREFIX = "seed:graph:";

export async function seedGraphInstances(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
) {
  const singletonTypes = [
    ...EVERGREEN_DEV_SINGLETON_TYPES,
    ...EVERGREEN_DESIGN_SINGLETON_TYPES,
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
    }
  }

  return { hypothesisId };
}
