import type { NodeType } from "@ssota/contracts";
import {
  DESIGN_THEME_SCHEMA_VERSION,
  PLATFORM_DESIGN_THEME_TOKENS,
} from "@ssota/contracts/catalog";
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
  "design_theme",
  "page_wireframe",
] as const satisfies readonly NodeType[];

/** @deprecated OKR nodes are multi-instance; use seedDemoOkr instead. */
export const EXECUTIVE_SINGLETON_TYPES = [] as const satisfies readonly NodeType[];

const GRAPH_SEED_IDEMPOTENCY_PREFIX = "seed:graph:";
const DEMO_OKR_SEED_TITLE = "Demo: First Release completion loop";
const DEMO_OKR_SEED_KEY = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}demo_okr`;
const DEMO_UI_COMPONENT_SEED_KEY = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}ui_component_demo`;

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

    const properties =
      nodeType === "design_theme"
        ? {
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${nodeType}`,
            schema_version: DESIGN_THEME_SCHEMA_VERSION,
            tokens: PLATFORM_DESIGN_THEME_TOKENS,
          }
        : { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${nodeType}` };

    await db.insert(schema.nodes).values({
      projectId,
      nodeType,
      title: nodeType === "design_theme" ? "Design theme" : "",
      properties,
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

  await seedDemoOkr(db, projectId);
  await seedDemoUiComponents(db, projectId);

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

async function seedDemoOkr(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
) {
  const existingObjective = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeType, "objective"),
        eq(schema.nodes.title, DEMO_OKR_SEED_TITLE),
      ),
    )
    .limit(1);

  if (existingObjective.length > 0) return;

  const [roadmap] = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeType, "roadmap"),
      ),
    )
    .limit(1);

  const [objective] = await db
    .insert(schema.nodes)
    .values({
      projectId,
      nodeType: "objective",
      title: DEMO_OKR_SEED_TITLE,
      properties: {
        period: "Q2 2026",
        priority: "high",
        status: "on_track",
        seed: DEMO_OKR_SEED_KEY,
      },
      lifecycleStatus: "Active",
    })
    .returning({ id: schema.nodes.id });

  if (!objective?.id) return;

  if (roadmap?.id) {
    await db.insert(schema.edges).values({
      projectId,
      edgeType: "informs",
      sourceNodeId: roadmap.id,
      targetNodeId: objective.id,
      properties: { seed: `${DEMO_OKR_SEED_KEY}:informs` },
    });
  }

  const [kr1] = await db
    .insert(schema.nodes)
    .values({
      projectId,
      nodeType: "key_result",
      title: "Pilot workspaces complete first Release with retrospective",
      properties: {
        baseline: 0,
        target: 8,
        current_value: 6,
        unit: "workspaces",
        direction: "increase",
        status: "on_track",
        seed: `${DEMO_OKR_SEED_KEY}:kr1`,
      },
      lifecycleStatus: "Active",
    })
    .returning({ id: schema.nodes.id });

  const [kr2] = await db
    .insert(schema.nodes)
    .values({
      projectId,
      nodeType: "key_result",
      title: "Onboarding completion rate improvement",
      properties: {
        baseline: 40,
        target: 70,
        current_value: 52,
        unit: "%",
        direction: "increase",
        status: "on_track",
        seed: `${DEMO_OKR_SEED_KEY}:kr2`,
      },
      lifecycleStatus: "Active",
    })
    .returning({ id: schema.nodes.id });

  const [kpi] = await db
    .insert(schema.nodes)
    .values({
      projectId,
      nodeType: "kpi",
      title: "Workspace creation rate",
      properties: {
        baseline: 10,
        target: 25,
        unit: "%",
        cadence: "weekly",
        direction: "increase",
        status: "active",
        seed: `${DEMO_OKR_SEED_KEY}:kpi`,
      },
      lifecycleStatus: "Active",
    })
    .returning({ id: schema.nodes.id });

  for (const kr of [kr1, kr2]) {
    if (!kr?.id) continue;
    await db.insert(schema.edges).values({
      projectId,
      edgeType: "contributes_to",
      sourceNodeId: kr.id,
      targetNodeId: objective.id,
      properties: { seed: `${DEMO_OKR_SEED_KEY}:contributes_to` },
    });
  }

  if (kr1?.id && kpi?.id) {
    await db.insert(schema.edges).values({
      projectId,
      edgeType: "measured_by",
      sourceNodeId: kr1.id,
      targetNodeId: kpi.id,
      properties: { seed: `${DEMO_OKR_SEED_KEY}:measured_by` },
    });
  }

  if (kpi?.id) {
    await db.insert(schema.edges).values({
      projectId,
      edgeType: "tracked_by",
      sourceNodeId: objective.id,
      targetNodeId: kpi.id,
      properties: { seed: `${DEMO_OKR_SEED_KEY}:tracked_by` },
    });

    const [snapshot] = await db
      .insert(schema.nodes)
      .values({
        projectId,
        nodeType: "metric_snapshot",
        title: "Workspace creation rate baseline",
        properties: {
          value: 12,
          captured_at: new Date().toISOString(),
          snapshot_kind: "baseline",
          source: "manual",
          seed: `${DEMO_OKR_SEED_KEY}:snapshot`,
        },
        lifecycleStatus: "Active",
      })
      .returning({ id: schema.nodes.id });

    if (snapshot?.id) {
      await db.insert(schema.edges).values({
        projectId,
        edgeType: "snapshotted_from",
        sourceNodeId: snapshot.id,
        targetNodeId: kpi.id,
        properties: { seed: `${DEMO_OKR_SEED_KEY}:snapshotted_from` },
      });
    }
  }
}

async function seedDemoUiComponents(
  db: ReturnType<typeof createDb>["db"],
  projectId: string,
) {
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
    seed: `${DEMO_UI_COMPONENT_SEED_KEY}:button`,
  };

  const existingButton = await db
    .select({ id: schema.nodes.id, properties: schema.nodes.properties })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeType, "ui_component"),
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
        nodeType: "ui_component",
        title: "Demo Button",
        properties: buttonProperties,
        content: JSON.stringify(buttonContentV2),
        lifecycleStatus: "Active",
      })
      .returning({ id: schema.nodes.id });
    buttonId = button?.id;
  } else {
    const representation = (existingButton[0]?.properties as { representation?: string })
      ?.representation;
    if (representation !== "source") {
      await db
        .update(schema.nodes)
        .set({
          properties: buttonProperties,
          content: JSON.stringify(buttonContentV2),
        })
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
    seed: `${DEMO_UI_COMPONENT_SEED_KEY}:card`,
  };

  const existingCard = await db
    .select({ id: schema.nodes.id, properties: schema.nodes.properties })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.projectId, projectId),
        eq(schema.nodes.nodeType, "ui_component"),
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
        nodeType: "ui_component",
        title: "Demo Card",
        properties: cardProperties,
        content: JSON.stringify(cardContentV2),
        lifecycleStatus: "Active",
      })
      .returning({ id: schema.nodes.id });
    cardId = card?.id;
  } else {
    const representation = (existingCard[0]?.properties as { representation?: string })
      ?.representation;
    if (representation !== "source") {
      await db
        .update(schema.nodes)
        .set({
          properties: cardProperties,
          content: JSON.stringify(cardContentV2),
        })
        .where(eq(schema.nodes.id, cardId));
    }
  }

  if (!cardId) return;

  const existingEdge = await db
    .select({ id: schema.edges.id })
    .from(schema.edges)
    .where(
      and(
        eq(schema.edges.projectId, projectId),
        eq(schema.edges.edgeType, "composed_of"),
        eq(schema.edges.sourceNodeId, cardId),
        eq(schema.edges.targetNodeId, buttonId),
      ),
    )
    .limit(1);

  if (existingEdge.length === 0) {
    await db.insert(schema.edges).values({
      projectId,
      edgeType: "composed_of",
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
