import type { NodeType } from "@ssota/contracts";
import {
  DESIGN_THEME_SCHEMA_VERSION,
  PLATFORM_DESIGN_THEME_TOKENS,
} from "@ssota/contracts/catalog";
import { and, eq } from "drizzle-orm";
import type { createDb } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { seedDevWorkflowCatalog } from "../../ports/db-catalog-read-port.js";

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
  "design_theme",
  "page_wireframe",
] as const satisfies readonly NodeType[];

export const EXECUTIVE_SINGLETON_TYPES = [] as const satisfies readonly NodeType[];

const GRAPH_SEED_IDEMPOTENCY_PREFIX = "seed:graph:";
const DEMO_OKR_SEED_TITLE = "Demo: First Release completion loop";
const DEMO_OKR_SEED_KEY = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}demo_okr`;
const DEMO_UI_COMPONENT_SEED_KEY = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}ui_component_demo`;

type CatalogMaps = {
  nodeKeyToId: Map<string, string>;
  edgeKeyToId: Map<string, string>;
};

async function findNodeByCatalogKey(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
  catalogKey: string,
  nodeCatalogId: string,
) {
  const rows = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeCatalogId, nodeCatalogId),
      ),
    )
    .limit(1);
  return rows[0]?.id;
}

export async function seedGraphInstances(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
) {
  const { nodeKeyToId, edgeKeyToId } = await seedDevWorkflowCatalog(db, projectId);
  const maps: CatalogMaps = { nodeKeyToId, edgeKeyToId };

  const singletonTypes = [
    ...EVERGREEN_DEV_SINGLETON_TYPES,
    ...EVERGREEN_DESIGN_SINGLETON_TYPES,
    ...EXECUTIVE_SINGLETON_TYPES,
  ];

  for (const catalogKey of singletonTypes) {
    const nodeCatalogId = nodeKeyToId.get(catalogKey);
    if (!nodeCatalogId) continue;

    const existing = await findNodeByCatalogKey(
      db,
      projectId,
      catalogKey,
      nodeCatalogId,
    );
    if (existing) continue;

    const properties =
      catalogKey === "design_theme"
        ? {
            lifecycleStatus: "Draft",
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${catalogKey}`,
            schema_version: DESIGN_THEME_SCHEMA_VERSION,
            tokens: PLATFORM_DESIGN_THEME_TOKENS,
          }
        : {
            lifecycleStatus: "Draft",
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${catalogKey}`,
          };

    await db.insert(schema.nodes).values({
      projectId,
      nodeCatalogId,
      title: catalogKey === "design_theme" ? "Design theme" : "",
      properties,
      schemaVersion: 1,
    });
  }

  await migrateLegacyRoadmapSingletons(db, projectId, maps);

  const hypothesisCatalogId = nodeKeyToId.get("hypothesis");
  let hypothesisId: string | undefined;
  if (hypothesisCatalogId) {
    const hypothesisExisting = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.projectId, projectId),
          eq(schema.nodes.nodeCatalogId, hypothesisCatalogId),
        ),
      )
      .limit(1);

    hypothesisId = hypothesisExisting[0]?.id;
    if (!hypothesisId) {
      const [hypothesis] = await db
        .insert(schema.nodes)
        .values({
          projectId,
          nodeCatalogId: hypothesisCatalogId,
          title: "Smoke hypothesis",
          properties: {
            lifecycleStatus: "Draft",
            status: "draft",
            summary: "Seed hypothesis for integration and E2E",
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}hypothesis`,
          },
        })
        .returning({ id: schema.nodes.id });
      hypothesisId = hypothesis?.id;
    }
  }

  const initiativeCatalogId = nodeKeyToId.get("initiative");
  const bundleExisting = initiativeCatalogId
    ? await db
        .select({ id: schema.nodes.id })
        .from(schema.nodes)
        .where(
          and(
            eq(schema.nodes.projectId, projectId),
            eq(schema.nodes.nodeCatalogId, initiativeCatalogId),
            eq(schema.nodes.title, "Smoke initiative"),
          ),
        )
        .limit(1)
    : [];

  if (bundleExisting && bundleExisting.length === 0) {
    const releaseCatalogId = nodeKeyToId.get("release");
    const pairedCatalogId = edgeKeyToId.get("paired_with");
    if (initiativeCatalogId && releaseCatalogId && pairedCatalogId) {
      const [initiative] = await db
        .insert(schema.nodes)
        .values({
          projectId,
          nodeCatalogId: initiativeCatalogId,
          title: "Smoke initiative",
          properties: {
            lifecycleStatus: "Draft",
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}initiative`,
          },
        })
        .returning({ id: schema.nodes.id });

      const [release] = await db
        .insert(schema.nodes)
        .values({
          projectId,
          nodeCatalogId: releaseCatalogId,
          title: "v0.0.0-smoke",
          properties: {
            lifecycleStatus: "Draft",
            version: "0.0.0-smoke",
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}release`,
          },
        })
        .returning({ id: schema.nodes.id });

      if (initiative?.id && release?.id) {
        await db.insert(schema.edges).values({
          projectId,
          edgeCatalogId: pairedCatalogId,
          sourceNodeId: initiative.id,
          targetNodeId: release.id,
          properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}paired_with` },
        });

        await seedInitiativeScopedNodes(db, projectId, initiative.id, maps);
      }
    }
  } else if (bundleExisting?.[0]?.id) {
    await seedInitiativeScopedNodes(
      db,
      projectId,
      bundleExisting[0].id,
      maps,
    );
  }

  await seedDemoOkr(db, projectId, maps);
  await seedDemoUiComponents(db, projectId, maps);

  return { hypothesisId };
}

async function migrateLegacyRoadmapSingletons(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
  maps: CatalogMaps,
) {
  const roadmapCatalogId = maps.nodeKeyToId.get("roadmap");
  if (!roadmapCatalogId) return;

  const legacyRows = await db
    .select({
      id: schema.nodes.id,
      properties: schema.nodes.properties,
    })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeCatalogId, roadmapCatalogId),
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

async function seedDemoOkr(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
  maps: CatalogMaps,
) {
  const objectiveCatalogId = maps.nodeKeyToId.get("objective");
  if (!objectiveCatalogId) return;

  const existingObjective = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeCatalogId, objectiveCatalogId),
        eq(schema.nodes.title, DEMO_OKR_SEED_TITLE),
      ),
    )
    .limit(1);

  if (existingObjective.length > 0) return;

  const roadmapCatalogId = maps.nodeKeyToId.get("roadmap");
  const [roadmap] = roadmapCatalogId
    ? await db
        .select({ id: schema.nodes.id })
        .from(schema.nodes)
        .where(
          and(
            eq(schema.nodes.projectId, projectId),
            eq(schema.nodes.nodeCatalogId, roadmapCatalogId),
          ),
        )
        .limit(1)
    : [];

  const [objective] = await db
    .insert(schema.nodes)
    .values({
      projectId,
      nodeCatalogId: objectiveCatalogId,
      title: DEMO_OKR_SEED_TITLE,
      properties: {
        lifecycleStatus: "Active",
        period: "Q2 2026",
        priority: "high",
        status: "on_track",
        seed: DEMO_OKR_SEED_KEY,
      },
    })
    .returning({ id: schema.nodes.id });

  if (!objective?.id) return;

  const informsId = maps.edgeKeyToId.get("informs");
  if (roadmap?.id && informsId) {
    await db.insert(schema.edges).values({
      projectId,
      edgeCatalogId: informsId,
      sourceNodeId: roadmap.id,
      targetNodeId: objective.id,
      properties: { seed: `${DEMO_OKR_SEED_KEY}:informs` },
    });
  }

  const krCatalogId = maps.nodeKeyToId.get("key_result");
  const kpiCatalogId = maps.nodeKeyToId.get("kpi");
  const snapshotCatalogId = maps.nodeKeyToId.get("metric_snapshot");
  if (!krCatalogId || !kpiCatalogId) return;

  const [kr1] = await db
    .insert(schema.nodes)
    .values({
      projectId,
      nodeCatalogId: krCatalogId,
      title: "Pilot workspaces complete first Release with retrospective",
      properties: {
        lifecycleStatus: "Active",
        baseline: 0,
        target: 8,
        current_value: 6,
        unit: "workspaces",
        direction: "increase",
        status: "on_track",
        seed: `${DEMO_OKR_SEED_KEY}:kr1`,
      },
    })
    .returning({ id: schema.nodes.id });

  const [kr2] = await db
    .insert(schema.nodes)
    .values({
      projectId,
      nodeCatalogId: krCatalogId,
      title: "Onboarding completion rate improvement",
      properties: {
        lifecycleStatus: "Active",
        baseline: 40,
        target: 70,
        current_value: 52,
        unit: "%",
        direction: "increase",
        status: "on_track",
        seed: `${DEMO_OKR_SEED_KEY}:kr2`,
      },
    })
    .returning({ id: schema.nodes.id });

  const [kpi] = await db
    .insert(schema.nodes)
    .values({
      projectId,
      nodeCatalogId: kpiCatalogId,
      title: "Workspace creation rate",
      properties: {
        lifecycleStatus: "Active",
        baseline: 10,
        target: 25,
        unit: "%",
        cadence: "weekly",
        direction: "increase",
        status: "active",
        seed: `${DEMO_OKR_SEED_KEY}:kpi`,
      },
    })
    .returning({ id: schema.nodes.id });

  const contributesId = maps.edgeKeyToId.get("contributes_to");
  if (contributesId) {
    for (const kr of [kr1, kr2]) {
      if (!kr?.id) continue;
      await db.insert(schema.edges).values({
        projectId,
        edgeCatalogId: contributesId,
        sourceNodeId: kr.id,
        targetNodeId: objective.id,
        properties: { seed: `${DEMO_OKR_SEED_KEY}:contributes_to` },
      });
    }
  }

  const measuredById = maps.edgeKeyToId.get("measured_by");
  if (kr1?.id && kpi?.id && measuredById) {
    await db.insert(schema.edges).values({
      projectId,
      edgeCatalogId: measuredById,
      sourceNodeId: kr1.id,
      targetNodeId: kpi.id,
      properties: { seed: `${DEMO_OKR_SEED_KEY}:measured_by` },
    });
  }

  const trackedById = maps.edgeKeyToId.get("tracked_by");
  const snapshottedId = maps.edgeKeyToId.get("snapshotted_from");
  if (kpi?.id && trackedById) {
    await db.insert(schema.edges).values({
      projectId,
      edgeCatalogId: trackedById,
      sourceNodeId: objective.id,
      targetNodeId: kpi.id,
      properties: { seed: `${DEMO_OKR_SEED_KEY}:tracked_by` },
    });

    if (snapshotCatalogId && snapshottedId) {
      const [snapshot] = await db
        .insert(schema.nodes)
        .values({
          projectId,
          nodeCatalogId: snapshotCatalogId,
          title: "Workspace creation rate baseline",
          properties: {
            lifecycleStatus: "Active",
            value: 12,
            captured_at: new Date().toISOString(),
            snapshot_kind: "baseline",
            source: "manual",
            seed: `${DEMO_OKR_SEED_KEY}:snapshot`,
          },
        })
        .returning({ id: schema.nodes.id });

      if (snapshot?.id) {
        await db.insert(schema.edges).values({
          projectId,
          edgeCatalogId: snapshottedId,
          sourceNodeId: snapshot.id,
          targetNodeId: kpi.id,
          properties: { seed: `${DEMO_OKR_SEED_KEY}:snapshotted_from` },
        });
      }
    }
  }
}

async function seedDemoUiComponents(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
  maps: CatalogMaps,
) {
  const uiCatalogId = maps.nodeKeyToId.get("ui_component");
  const composedOfId = maps.edgeKeyToId.get("composed_of");
  if (!uiCatalogId) return;

  const buttonSource = `import { Button } from "@ssota/ui/components/ui/button";

export default function Component() {
  return (
    <Button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
      Button
    </Button>
  );
}
`;

  const buttonContentV2 = {
    schemaVersion: 2 as const,
    files: {
      "Component.tsx": buttonSource,
    },
  };

  const buttonProperties = {
    slug: "demo-button",
    tier: "primitive" as const,
    representation: "source" as const,
    contentSchemaVersion: 2 as const,
    entry: "Component.tsx",
    fileKeys: ["Component.tsx"],
    dependencies: {
      "@ssota/ui": "workspace:*",
    },
    content: buttonContentV2,
    lifecycleStatus: "Active",
    seed: `${DEMO_UI_COMPONENT_SEED_KEY}:button`,
  };

  const existingButton = await db
    .select({ id: schema.nodes.id, properties: schema.nodes.properties })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeCatalogId, uiCatalogId),
        eq(schema.nodes.title, "Demo Button"),
      ),
    )
    .limit(1);

  let buttonId = existingButton[0]?.id;

  if (!buttonId) {
    const [button] = await db
      .insert(schema.nodes)
      .values({
        projectId,
        nodeCatalogId: uiCatalogId,
        title: "Demo Button",
        properties: buttonProperties,
      })
      .returning({ id: schema.nodes.id });
    buttonId = button?.id;
  } else {
    const representation = (existingButton[0]?.properties as { representation?: string })
      ?.representation;
    if (representation !== "source") {
      await db
        .update(schema.nodes)
        .set({ properties: buttonProperties })
        .where(eq(schema.nodes.id, buttonId));
    }
  }

  if (!buttonId) return;

  const cardSource = `import { Button } from "@ssota/ui/components/ui/button";

export default function Component() {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <Button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Button
      </Button>
    </div>
  );
}
`;

  const cardContentV2 = {
    schemaVersion: 2 as const,
    files: {
      "Component.tsx": cardSource,
    },
  };

  const cardProperties = {
    slug: "demo-card",
    tier: "composite" as const,
    representation: "source" as const,
    contentSchemaVersion: 2 as const,
    entry: "Component.tsx",
    fileKeys: ["Component.tsx"],
    dependencies: {
      "@ssota/ui": "workspace:*",
    },
    content: cardContentV2,
    lifecycleStatus: "Active",
    seed: `${DEMO_UI_COMPONENT_SEED_KEY}:card`,
  };

  const existingCard = await db
    .select({ id: schema.nodes.id, properties: schema.nodes.properties })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeCatalogId, uiCatalogId),
        eq(schema.nodes.title, "Demo Card"),
      ),
    )
    .limit(1);

  let cardId = existingCard[0]?.id;

  if (!cardId) {
    const [card] = await db
      .insert(schema.nodes)
      .values({
        projectId,
        nodeCatalogId: uiCatalogId,
        title: "Demo Card",
        properties: cardProperties,
      })
      .returning({ id: schema.nodes.id });
    cardId = card?.id;
  } else {
    const representation = (existingCard[0]?.properties as { representation?: string })
      ?.representation;
    if (representation !== "source") {
      await db
        .update(schema.nodes)
        .set({ properties: cardProperties })
        .where(eq(schema.nodes.id, cardId));
    }
  }

  if (!cardId || !composedOfId) return;

  const existingEdge = await db
    .select({ id: schema.edges.id })
    .from(schema.edges)
    .where(
      and(
        eq(schema.edges.projectId, projectId),
        eq(schema.edges.edgeCatalogId, composedOfId),
        eq(schema.edges.sourceNodeId, cardId),
        eq(schema.edges.targetNodeId, buttonId),
      ),
    )
    .limit(1);

  if (existingEdge.length === 0) {
    await db.insert(schema.edges).values({
      projectId,
      edgeCatalogId: composedOfId,
      sourceNodeId: cardId,
      targetNodeId: buttonId,
      properties: { seed: `${DEMO_UI_COMPONENT_SEED_KEY}:composed_of` },
    });
  }
}

async function seedInitiativeScopedNodes(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
  initiativeId: string,
  maps: CatalogMaps,
) {
  const forInitiativeId = maps.edgeKeyToId.get("for_initiative");
  const scopedSeeds = [
    { catalogKey: "prd" as const, title: "Smoke PRD" },
    { catalogKey: "feature" as const, title: "Smoke feature" },
  ];

  for (const seed of scopedSeeds) {
    const nodeCatalogId = maps.nodeKeyToId.get(seed.catalogKey);
    if (!nodeCatalogId) continue;

    const existing = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.projectId, projectId),
          eq(schema.nodes.nodeCatalogId, nodeCatalogId),
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
          nodeCatalogId,
          title: seed.title,
          properties: {
            lifecycleStatus: "Draft",
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${seed.catalogKey}`,
          },
        })
        .returning({ id: schema.nodes.id });
      nodeId = row?.id;
    }

    if (!nodeId || !forInitiativeId) continue;

    const edgeExisting = await db
      .select({ id: schema.edges.id })
      .from(schema.edges)
      .where(
        and(
          eq(schema.edges.projectId, projectId),
          eq(schema.edges.edgeCatalogId, forInitiativeId),
          eq(schema.edges.sourceNodeId, nodeId),
          eq(schema.edges.targetNodeId, initiativeId),
        ),
      )
      .limit(1);

    if (edgeExisting.length === 0) {
      await db.insert(schema.edges).values({
        projectId,
        edgeCatalogId: forInitiativeId,
        sourceNodeId: nodeId,
        targetNodeId: initiativeId,
        properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}for_initiative` },
      });
    }
  }
}
