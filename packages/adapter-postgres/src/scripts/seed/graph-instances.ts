import type { NodeType } from "@ssota/contracts";
import {
  DESIGN_THEME_SCHEMA_VERSION,
  DESIGN_TOOLCHAIN_SCHEMA_VERSION,
  PLATFORM_DESIGN_THEME_TOKENS,
  PLATFORM_DESIGN_TOOLCHAIN_LOCKFILE,
  PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON,
} from "@ssota/contracts/catalog";
import { and, eq, sql } from "drizzle-orm";
import type { createDb } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { seedDomainCatalog } from "../../ports/db-catalog-read-port.js";
import { resolveOrganizationIdForTeamspace } from "../../teamspace-org-scope.js";

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
  "design_toolchain",
  "page_wireframe",
] as const satisfies readonly NodeType[];

export const EXECUTIVE_SINGLETON_TYPES = [] as const satisfies readonly NodeType[];

const GRAPH_SEED_IDEMPOTENCY_PREFIX = "seed:graph:";
const DEMO_OKR_SEED_TITLE = "Demo: First Release completion loop";
const DEMO_OKR_SEED_TITLE_2 = "Demo: Onboarding excellence";
const DEMO_OKR_SEED_KEY = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}demo_okr`;
const DEMO_OKR_SEED_KEY_2 = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}demo_okr_2`;
const DEMO_UI_COMPONENT_SEED_KEY = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}ui_component_demo`;

type CatalogMaps = {
  nodeKeyToId: Map<string, string>;
  edgeKeyToId: Map<string, string>;
};

async function findNodeByCatalogKey(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  catalogKey: string,
  nodeCatalogId: string,
) {
  const rows = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, nodeCatalogId),
      ),
    )
    .limit(1);
  return rows[0]?.id;
}

export async function seedGraphInstances(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
) {
  const organizationId = await resolveOrganizationIdForTeamspace(db, teamspaceId);
  const { nodeKeyToId, edgeKeyToId } = await seedDomainCatalog(db, organizationId);
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
      teamspaceId,
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
        : catalogKey === "design_toolchain"
          ? {
              lifecycleStatus: "Draft",
              seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${catalogKey}`,
              schema_version: DESIGN_TOOLCHAIN_SCHEMA_VERSION,
              package_json: PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON,
              lockfile: PLATFORM_DESIGN_TOOLCHAIN_LOCKFILE,
            }
          : catalogKey === "product_roadmap"
            ? {
                doc_status: "active",
                summary:
                  "Graph-first Console, end-user app partition, and catalog-driven page runtime",
                seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${catalogKey}`,
                content: [
                  {
                    type: "heading",
                    props: { level: 2 },
                    content: "Product direction",
                  },
                  {
                    type: "paragraph",
                    content:
                      "Long-term strategic themes that guide annual and quarterly planning.",
                  },
                  {
                    type: "bulletListItem",
                    content: "Console v2.7 graph UI as the builder workspace",
                  },
                  {
                    type: "bulletListItem",
                    content: "End-user /app with per-account graph partition",
                  },
                  {
                    type: "bulletListItem",
                    content: "Design Studio artifact build and widget preview",
                  },
                ],
              }
            : {
                lifecycleStatus: "Draft",
                seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${catalogKey}`,
              };

    await db.insert(schema.nodes).values({
      teamspaceId,
      nodeCatalogId,
      title:
        catalogKey === "design_theme"
          ? "Design theme"
          : catalogKey === "design_toolchain"
            ? "Design toolchain"
            : catalogKey === "product_roadmap"
              ? "Product roadmap"
              : "",
      properties,
      schemaVersion: 1,
    });
  }

  await migrateLegacyRoadmapSingletons(db, teamspaceId, maps);
  await seedProductRoadmapDoc(db, teamspaceId, maps);
  await seedProductRoadmapArchivedDoc(db, teamspaceId, maps);
  await seedRoadmapPlanningDocs(db, teamspaceId, maps);

  const hypothesisId = await seedResearchDocs(db, teamspaceId, maps);
  await seedMarketResearchHub(db, teamspaceId, maps, hypothesisId);

  const initiativeCatalogId = nodeKeyToId.get("initiative");
  const bundleExisting = initiativeCatalogId
    ? await db
        .select({ id: schema.nodes.id })
        .from(schema.nodes)
        .where(
          and(
            eq(schema.nodes.teamspaceId, teamspaceId),
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
          teamspaceId,
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
          teamspaceId,
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
          teamspaceId,
          edgeCatalogId: pairedCatalogId,
          sourceNodeId: initiative.id,
          targetNodeId: release.id,
          properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}paired_with` },
        });

        await seedInitiativeScopedNodes(db, teamspaceId, initiative.id, maps);
      }
    }
  } else if (bundleExisting?.[0]?.id) {
    await seedInitiativeScopedNodes(
      db,
      teamspaceId,
      bundleExisting[0].id,
      maps,
    );
  }

  await seedDemoOkr(db, teamspaceId, maps);
  await seedDemoUiComponents(db, teamspaceId, maps);

  return { hypothesisId };
}

async function migrateLegacyRoadmapSingletons(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
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
        eq(schema.nodes.teamspaceId, teamspaceId),
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

const ROADMAP_DOC_SEED_PREFIX = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}roadmap_doc:`;
const PRODUCT_ROADMAP_SEED_KEY = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}product_roadmap_doc`;

async function seedProductRoadmapDoc(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
) {
  const catalogId = maps.nodeKeyToId.get("product_roadmap");
  if (!catalogId) return;

  const [existing] = await db
    .select({
      id: schema.nodes.id,
      title: schema.nodes.title,
      properties: schema.nodes.properties,
    })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, catalogId),
      ),
    )
    .limit(1);

  const content = [
    {
      type: "heading",
      props: { level: 2 },
      content: "Product direction",
    },
    {
      type: "paragraph",
      content:
        "Long-term strategic themes that guide annual and quarterly planning.",
    },
    {
      type: "bulletListItem",
      content: "Console v2.7 graph UI as the builder workspace",
    },
    {
      type: "bulletListItem",
      content: "End-user /app with per-account graph partition",
    },
    {
      type: "bulletListItem",
      content: "Design Studio artifact build and widget preview",
    },
  ];

  if (!existing) return;

  const props = existing.properties as Record<string, unknown>;
  const docStatus =
    typeof props.doc_status === "string"
      ? props.doc_status.toLowerCase()
      : undefined;
  const needsDocStatus = docStatus !== "active";
  const needsContent = props.seed !== PRODUCT_ROADMAP_SEED_KEY;
  if (!needsDocStatus && !needsContent) return;

  const { lifecycleStatus: _legacy, ...rest } = props;
  await db
    .update(schema.nodes)
    .set({
      title: existing.title || "Product roadmap",
      properties: {
        ...rest,
        doc_status: "active",
        ...(needsContent
          ? {
              summary:
                "Graph-first Console, end-user app partition, and catalog-driven page runtime",
              content,
              seed: PRODUCT_ROADMAP_SEED_KEY,
            }
          : {}),
      },
    })
    .where(eq(schema.nodes.id, existing.id));
}

const PRODUCT_ROADMAP_ARCHIVED_SEED_KEY = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}product_roadmap_archived`;

async function seedProductRoadmapArchivedDoc(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
) {
  const catalogId = maps.nodeKeyToId.get("product_roadmap");
  if (!catalogId) return;

  const title = "Product roadmap (2025 archive)";
  const [existing] = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, catalogId),
        eq(schema.nodes.title, title),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(schema.nodes).values({
    teamspaceId,
    nodeCatalogId: catalogId,
    title,
    properties: {
      doc_status: "archived",
      summary: "Pre graph-first pivot themes retained for reference",
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "2025 direction (archived)",
        },
        {
          type: "paragraph",
          content:
            "Earlier strategic focus before Console v2.7 graph runtime became the builder SSOT.",
        },
      ],
      seed: PRODUCT_ROADMAP_ARCHIVED_SEED_KEY,
    },
    schemaVersion: 1,
  });
}

type RoadmapDocSeed = {
  seedSuffix: string;
  title: string;
  summary: string;
  docStatus: "draft" | "review" | "approved" | "active" | "archived";
  kind: "annual" | "quarter";
  year: number;
  quarter?: 1 | 2 | 3 | 4;
  content: unknown[];
};

async function seedRoadmapPlanningDocs(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
) {
  const roadmapCatalogId = maps.nodeKeyToId.get("roadmap");
  if (!roadmapCatalogId) return;

  const year = new Date().getFullYear();
  const docs: RoadmapDocSeed[] = [
    {
      seedSuffix: "annual-prev",
      title: `${year - 1} 연간 로드맵`,
      summary: "Prior-year planning baseline",
      docStatus: "archived",
      kind: "annual",
      year: year - 1,
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Prior year themes",
        },
        {
          type: "paragraph",
          content: "Archived annual roadmap kept for year-over-year comparison.",
        },
      ],
    },
    {
      seedSuffix: "annual",
      title: `${year} 연간 로드맵`,
      summary: "Console v2.7 출시, end-user app, Design Studio 파이프라인",
      docStatus: "active",
      kind: "annual",
      year,
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Annual themes",
        },
        {
          type: "paragraph",
          content:
            "Graph-first Console, per-user app partition, and catalog-driven page runtime.",
        },
        {
          type: "bulletListItem",
          content: "Q1–Q2: Console v2.7 graph UI + initiative L2 screens",
        },
        {
          type: "bulletListItem",
          content: "Q3: End-user /app shell with account isolation",
        },
        {
          type: "bulletListItem",
          content: "Q4: Design Studio artifact build + Widget preview",
        },
      ],
    },
    {
      seedSuffix: "q1",
      title: `${year} Q1 분기 로드맵`,
      summary: "Page runtime catalog, Labs, roadmap document sheet pattern",
      docStatus: "draft",
      kind: "quarter",
      year,
      quarter: 1,
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Q1 deliverables",
        },
        {
          type: "paragraph",
          content:
            "Document-type pages open in a right-side sheet with BlockNote instead of inline accordion.",
        },
        {
          type: "bulletListItem",
          content: "DocumentCardListSheet catalog component",
        },
        {
          type: "bulletListItem",
          content: "Executive roadmap dynamic page integration",
        },
      ],
    },
    {
      seedSuffix: "q2",
      title: `${year} Q2 분기 로드맵`,
      summary: "Initiative drill-in, scoped bindings, 18 L2 screens",
      docStatus: "review",
      kind: "quarter",
      year,
      quarter: 2,
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Initiative workspace",
        },
        {
          type: "paragraph",
          content: "Scoped page bindings and template nav for initiative L2.",
        },
      ],
    },
  ];

  for (const doc of docs) {
    const seedKey = `${ROADMAP_DOC_SEED_PREFIX}${doc.seedSuffix}:${year}`;
    const existing = await db
      .select({
        id: schema.nodes.id,
        properties: schema.nodes.properties,
      })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.teamspaceId, teamspaceId),
          eq(schema.nodes.nodeCatalogId, roadmapCatalogId),
          eq(schema.nodes.title, doc.title),
        ),
      )
      .limit(1);
    if (existing[0]) {
      const props = existing[0].properties as Record<string, unknown>;
      const docStatus = props.doc_status;
      const needsDocStatus =
        typeof docStatus !== "string" ||
        docStatus.toLowerCase() !== doc.docStatus;
      if (needsDocStatus) {
        const { lifecycleStatus: _legacy, ...rest } = props;
        await db
          .update(schema.nodes)
          .set({
            properties: {
              ...rest,
              doc_status: doc.docStatus,
              seed: seedKey,
            },
          })
          .where(eq(schema.nodes.id, existing[0].id));
      }
      continue;
    }

    await db.insert(schema.nodes).values({
      teamspaceId,
      nodeCatalogId: roadmapCatalogId,
      title: doc.title,
      properties: {
        kind: doc.kind,
        year: doc.year,
        ...(doc.quarter != null ? { quarter: doc.quarter } : {}),
        doc_status: doc.docStatus,
        summary: doc.summary,
        content: doc.content,
        seed: seedKey,
      },
      schemaVersion: 1,
    });
  }
}

type ResearchDocSeed = {
  catalogKey: "market_research" | "user_research" | "hypothesis";
  seedSuffix: string;
  title: string;
  summary: string;
  lifecycleStatus: string;
  extraProperties?: Record<string, unknown>;
  content: unknown[];
};

const RESEARCH_DOC_SEED_PREFIX = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}research_doc:`;

async function seedResearchDocs(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
): Promise<string | undefined> {
  const docs: ResearchDocSeed[] = [
    {
      catalogKey: "market_research",
      seedSuffix: "competitive-landscape",
      title: "Competitive landscape — dev workflow tools",
      summary: "Notion, Linear, Cursor, and internal builder consoles",
      lifecycleStatus: "active",
      extraProperties: { source: "desk research", conducted_at: "2026-01-15" },
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Key competitors",
        },
        {
          type: "paragraph",
          content:
            "Teams mix docs (Notion), issue tracking (Linear), and AI IDE agents (Cursor). SSOTA targets a graph-native builder workspace with end-user app deployment.",
        },
        {
          type: "bulletListItem",
          content: "Notion: flexible docs, weak typed graph + workflow enforcement",
        },
        {
          type: "bulletListItem",
          content: "Linear: strong execution, limited product/research doc model",
        },
      ],
    },
    {
      catalogKey: "market_research",
      seedSuffix: "tam-segment",
      title: "TAM / segment sizing",
      summary: "Product eng teams adopting AI-assisted delivery",
      lifecycleStatus: "draft",
      extraProperties: { source: "analyst notes", conducted_at: "2026-02-01" },
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Initial segment",
        },
        {
          type: "paragraph",
          content:
            "Seed segment: 5–50 person product engineering teams dogfooding their own workflow in SSOTA.",
        },
      ],
    },
    {
      catalogKey: "user_research",
      seedSuffix: "onboarding-interviews",
      title: "Onboarding interviews (smoke cohort)",
      summary: "First-time builder setup and page runtime comprehension",
      lifecycleStatus: "review",
      extraProperties: { method: "interview", conducted_at: "2026-02-10" },
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Findings",
        },
        {
          type: "paragraph",
          content:
            "Builders expect sidebar page tree navigation and in-place document editing without losing list context.",
        },
        {
          type: "bulletListItem",
          content: "Document sheet pattern matches mental model from Notion side peek",
        },
      ],
    },
    {
      catalogKey: "hypothesis",
      seedSuffix: "smoke",
      title: "Smoke hypothesis",
      summary: "Document sheet list improves research doc iteration speed",
      lifecycleStatus: "draft",
      extraProperties: { status: "draft" },
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Hypothesis",
        },
        {
          type: "paragraph",
          content:
            "If research pages use DocumentCardListSheet, teams will edit market/user/hypothesis notes 2× faster than table-only navigation.",
        },
      ],
    },
  ];

  let hypothesisId: string | undefined;

  for (const doc of docs) {
    const catalogId = maps.nodeKeyToId.get(doc.catalogKey);
    if (!catalogId) continue;

    const seedKey = `${RESEARCH_DOC_SEED_PREFIX}${doc.seedSuffix}`;
    const existing = await db
      .select({ id: schema.nodes.id, properties: schema.nodes.properties })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.teamspaceId, teamspaceId),
          eq(schema.nodes.nodeCatalogId, catalogId),
          eq(schema.nodes.title, doc.title),
        ),
      )
      .limit(1);

    if (existing[0]) {
      if (doc.catalogKey === "hypothesis") {
        hypothesisId = existing[0].id;
      }
      const props = existing[0].properties as Record<string, unknown>;

      await db
        .update(schema.nodes)
        .set({
          properties: {
            ...props,
            summary: doc.summary,
            lifecycleStatus: doc.lifecycleStatus,
            content: doc.content,
            seed: seedKey,
            ...doc.extraProperties,
          },
        })
        .where(eq(schema.nodes.id, existing[0].id));
      continue;
    }

    const [inserted] = await db
      .insert(schema.nodes)
      .values({
        teamspaceId,
        nodeCatalogId: catalogId,
        title: doc.title,
        properties: {
          lifecycleStatus: doc.lifecycleStatus,
          summary: doc.summary,
          content: doc.content,
          seed: seedKey,
          ...doc.extraProperties,
        },
        schemaVersion: 1,
      })
      .returning({ id: schema.nodes.id });

    if (doc.catalogKey === "hypothesis") {
      hypothesisId = inserted?.id;
    }
  }

  return hypothesisId;
}

const MARKET_HUB_SEED_PREFIX = `${GRAPH_SEED_IDEMPOTENCY_PREFIX}market_hub:`;

async function findMarketResearchBySeedSuffix(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
  seedSuffix: string,
) {
  const catalogId = maps.nodeKeyToId.get("market_research");
  if (!catalogId) return undefined;

  const seedKey = `${RESEARCH_DOC_SEED_PREFIX}${seedSuffix}`;
  const [row] = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, catalogId),
        sql`${schema.nodes.properties}->>'seed' = ${seedKey}`,
      ),
    )
    .limit(1);
  return row?.id;
}

async function upsertSeededNode(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  catalogId: string,
  seedKey: string,
  title: string,
  properties: Record<string, unknown>,
) {
  const [existing] = await db
    .select({ id: schema.nodes.id, properties: schema.nodes.properties })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, catalogId),
        sql`${schema.nodes.properties}->>'seed' = ${seedKey}`,
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.nodes)
      .set({
        title,
        properties: { ...(existing.properties as Record<string, unknown>), ...properties, seed: seedKey },
      })
      .where(eq(schema.nodes.id, existing.id));
    return existing.id;
  }

  const [inserted] = await db
    .insert(schema.nodes)
    .values({
      teamspaceId,
      nodeCatalogId: catalogId,
      title,
      properties: { ...properties, seed: seedKey },
      schemaVersion: 1,
    })
    .returning({ id: schema.nodes.id });
  return inserted?.id;
}

async function ensureEdge(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  edgeCatalogId: string,
  sourceNodeId: string,
  targetNodeId: string,
  seedKey: string,
) {
  const [existing] = await db
    .select({ id: schema.edges.id })
    .from(schema.edges)
    .where(
      and(
        eq(schema.edges.teamspaceId, teamspaceId),
        eq(schema.edges.edgeCatalogId, edgeCatalogId),
        eq(schema.edges.sourceNodeId, sourceNodeId),
        eq(schema.edges.targetNodeId, targetNodeId),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(schema.edges).values({
    teamspaceId,
    edgeCatalogId,
    sourceNodeId,
    targetNodeId,
    properties: { seed: seedKey },
  });
}

async function seedMarketResearchHub(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
  hypothesisId: string | undefined,
) {
  const competitorCatalogId = maps.nodeKeyToId.get("competitor");
  const segmentCatalogId = maps.nodeKeyToId.get("market_segment");
  const sourceCatalogId = maps.nodeKeyToId.get("raw_source");
  const partOfId = maps.edgeKeyToId.get("part_of");
  const referencesId = maps.edgeKeyToId.get("references");
  const definesId = maps.edgeKeyToId.get("defines");
  const informsId = maps.edgeKeyToId.get("informs");
  if (
    !competitorCatalogId ||
    !segmentCatalogId ||
    !sourceCatalogId ||
    !partOfId ||
    !referencesId ||
    !definesId
  ) {
    return;
  }

  const studyId = await findMarketResearchBySeedSuffix(
    db,
    teamspaceId,
    maps,
    "competitive-landscape",
  );
  if (!studyId) return;

  const swotBlock = (heading: string, body: string) => [
    { type: "heading", props: { level: 3 }, content: heading },
    { type: "paragraph", content: body },
  ];

  const notionId = await upsertSeededNode(
    db,
    teamspaceId,
    competitorCatalogId,
    `${MARKET_HUB_SEED_PREFIX}competitor:notion`,
    "Notion",
    {
      lifecycleStatus: "active",
      category: "docs",
      positioning: "All-in-one workspace",
      website_url: "https://notion.so",
      pricing_tier: "freemium",
      last_reviewed_at: "2026-01-10",
      summary: "Flexible docs; weak typed graph enforcement",
      content: [
        ...swotBlock("Strengths", "Brand, templates, flexible blocks."),
        ...swotBlock("Weaknesses", "No graph-native workflow or end-user app deployment."),
      ],
    },
  );

  const linearId = await upsertSeededNode(
    db,
    teamspaceId,
    competitorCatalogId,
    `${MARKET_HUB_SEED_PREFIX}competitor:linear`,
    "Linear",
    {
      lifecycleStatus: "active",
      category: "issue tracking",
      positioning: "Fast issue tracking for product teams",
      website_url: "https://linear.app",
      pricing_tier: "paid",
      last_reviewed_at: "2026-01-12",
      summary: "Strong execution UX; limited research doc model",
      content: [
        ...swotBlock("Strengths", "Speed, keyboard UX, cycles."),
        ...swotBlock("Weaknesses", "Research and strategy docs are second-class."),
      ],
    },
  );

  const cursorId = await upsertSeededNode(
    db,
    teamspaceId,
    competitorCatalogId,
    `${MARKET_HUB_SEED_PREFIX}competitor:cursor`,
    "Cursor",
    {
      lifecycleStatus: "active",
      category: "AI IDE",
      positioning: "AI-native developer environment",
      website_url: "https://cursor.com",
      pricing_tier: "freemium",
      last_reviewed_at: "2026-01-14",
      summary: "Agentic coding; not a product workspace",
      content: [
        ...swotBlock("Strengths", "Deep code context, agent loops."),
        ...swotBlock("Weaknesses", "No shared product graph or end-user console."),
      ],
    },
  );

  const segmentId = await upsertSeededNode(
    db,
    teamspaceId,
    segmentCatalogId,
    `${MARKET_HUB_SEED_PREFIX}segment:product-eng-5-50`,
    "Product eng teams 5–50",
    {
      lifecycleStatus: "draft",
      segment_type: "ICP",
      tam: "$12B",
      sam: "$2.4B",
      som: "$120M",
      unit: "USD",
      geography: "Global",
      persona: "VP Eng / Head of Product",
      confidence: "medium",
      conducted_at: "2026-02-01",
      summary: "Teams dogfooding their own delivery workflow",
      content: [
        {
          type: "paragraph",
          content:
            "Initial wedge: small product engineering orgs that build internal tools and want graph-native research → delivery traceability.",
        },
      ],
    },
  );

  const youtubeSourceId = await upsertSeededNode(
    db,
    teamspaceId,
    sourceCatalogId,
    `${MARKET_HUB_SEED_PREFIX}source:youtube`,
    "Dev workflow tools landscape (YouTube)",
    {
      lifecycleStatus: "active",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platform: "youtube",
      publisher: "YouTube",
      captured_at: "2026-01-08",
      summary: "Analyst overview of Notion vs Linear vs AI IDEs",
      content: [
        {
          type: "paragraph",
          content: "Key points from video: teams want one workspace for research notes and shipping.",
        },
      ],
    },
  );

  const xSourceId = await upsertSeededNode(
    db,
    teamspaceId,
    sourceCatalogId,
    `${MARKET_HUB_SEED_PREFIX}source:x-thread`,
    "Founder thread on builder consoles",
    {
      lifecycleStatus: "active",
      url: "https://x.com/ssotalabs/status/1234567890",
      platform: "x",
      author: "@ssotalabs",
      captured_at: "2026-01-09",
      summary: "Thread on graph-native product ops",
      content: [
        {
          type: "paragraph",
          content: "Thread summary: end-user app deployment from the same graph is the differentiator.",
        },
      ],
    },
  );

  const articleSourceId = await upsertSeededNode(
    db,
    teamspaceId,
    sourceCatalogId,
    `${MARKET_HUB_SEED_PREFIX}source:article`,
    "Desk research — dev tool market map",
    {
      lifecycleStatus: "draft",
      url: "https://example.com/dev-tool-market-map",
      platform: "article",
      publisher: "Industry report",
      captured_at: "2026-01-07",
      summary: "Third-party market map PDF notes",
      content: [
        {
          type: "paragraph",
          content: "Desk research notes: consolidation trend toward AI-augmented workflow hubs.",
        },
      ],
    },
  );

  if (youtubeSourceId) {
    await ensureEdge(
      db,
      teamspaceId,
      partOfId,
      youtubeSourceId,
      studyId,
      `${MARKET_HUB_SEED_PREFIX}edge:youtube-part_of-study`,
    );
  }
  if (xSourceId) {
    await ensureEdge(
      db,
      teamspaceId,
      partOfId,
      xSourceId,
      studyId,
      `${MARKET_HUB_SEED_PREFIX}edge:x-part_of-study`,
    );
  }
  if (articleSourceId) {
    await ensureEdge(
      db,
      teamspaceId,
      partOfId,
      articleSourceId,
      studyId,
      `${MARKET_HUB_SEED_PREFIX}edge:article-part_of-study`,
    );
  }

  for (const competitorId of [notionId, linearId, cursorId]) {
    if (!competitorId) continue;
    await ensureEdge(
      db,
      teamspaceId,
      referencesId,
      studyId,
      competitorId,
      `${MARKET_HUB_SEED_PREFIX}edge:study-references-${competitorId}`,
    );
  }

  if (segmentId) {
    await ensureEdge(
      db,
      teamspaceId,
      definesId,
      studyId,
      segmentId,
      `${MARKET_HUB_SEED_PREFIX}edge:study-defines-segment`,
    );
  }

  if (notionId && youtubeSourceId) {
    await ensureEdge(
      db,
      teamspaceId,
      referencesId,
      youtubeSourceId,
      notionId,
      `${MARKET_HUB_SEED_PREFIX}edge:youtube-references-notion`,
    );
  }

  if (hypothesisId && informsId) {
    if (segmentId) {
      await ensureEdge(
        db,
        teamspaceId,
        informsId,
        segmentId,
        hypothesisId,
        `${MARKET_HUB_SEED_PREFIX}edge:segment-informs-hypothesis`,
      );
    }
    await ensureEdge(
      db,
      teamspaceId,
      informsId,
      studyId,
      hypothesisId,
      `${MARKET_HUB_SEED_PREFIX}edge:study-informs-hypothesis`,
    );
  }
}

type MetricSnapshotSeed = {
  seedKey: string;
  title: string;
  value: number;
  capturedAt: string;
  snapshotKind?: string;
};

async function ensureMetricSnapshots(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
  kpiId: string,
  snapshots: MetricSnapshotSeed[],
) {
  const snapshotCatalogId = maps.nodeKeyToId.get("metric_snapshot");
  const snapshottedId = maps.edgeKeyToId.get("snapshotted_from");
  if (!snapshotCatalogId || !snapshottedId) return;

  for (const snapshot of snapshots) {
    const [existing] = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.teamspaceId, teamspaceId),
          eq(schema.nodes.nodeCatalogId, snapshotCatalogId),
          sql`${schema.nodes.properties}->>'seed' = ${snapshot.seedKey}`,
        ),
      )
      .limit(1);
    if (existing) continue;

    const [row] = await db
      .insert(schema.nodes)
      .values({
        teamspaceId,
        nodeCatalogId: snapshotCatalogId,
        title: snapshot.title,
        properties: {
          value: snapshot.value,
          captured_at: snapshot.capturedAt,
          snapshot_kind: snapshot.snapshotKind ?? "checkpoint",
          source: "manual",
          seed: snapshot.seedKey,
        },
      })
      .returning({ id: schema.nodes.id });

    if (!row?.id) continue;

    await db.insert(schema.edges).values({
      teamspaceId,
      edgeCatalogId: snapshottedId,
      sourceNodeId: row.id,
      targetNodeId: kpiId,
      properties: { seed: `${snapshot.seedKey}:snapshotted_from` },
    });
  }
}

async function findKpiBySeed(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
  seedKey: string,
): Promise<string | null> {
  const kpiCatalogId = maps.nodeKeyToId.get("kpi");
  if (!kpiCatalogId) return null;

  const [row] = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, kpiCatalogId),
        sql`${schema.nodes.properties}->>'seed' = ${seedKey}`,
      ),
    )
    .limit(1);

  return row?.id ?? null;
}

const DEMO_OKR_WORKSPACE_SNAPSHOTS: MetricSnapshotSeed[] = [
  {
    seedKey: `${DEMO_OKR_SEED_KEY}:snapshot:1`,
    title: "Workspace creation rate — Apr",
    value: 10,
    capturedAt: "2026-04-05T00:00:00.000Z",
  },
  {
    seedKey: `${DEMO_OKR_SEED_KEY}:snapshot:2`,
    title: "Workspace creation rate — May",
    value: 14,
    capturedAt: "2026-05-12T00:00:00.000Z",
  },
  {
    seedKey: `${DEMO_OKR_SEED_KEY}:snapshot:3`,
    title: "Workspace creation rate — Jun",
    value: 18,
    capturedAt: "2026-06-18T00:00:00.000Z",
  },
  {
    seedKey: `${DEMO_OKR_SEED_KEY}:snapshot:4`,
    title: "Workspace creation rate — late Jun",
    value: 21,
    capturedAt: "2026-06-28T00:00:00.000Z",
  },
];

const DEMO_OKR_ONBOARDING_SNAPSHOTS: MetricSnapshotSeed[] = [
  {
    seedKey: `${DEMO_OKR_SEED_KEY_2}:snapshot:1`,
    title: "Time to first value — Jul",
    value: 16,
    capturedAt: "2026-07-08T00:00:00.000Z",
  },
  {
    seedKey: `${DEMO_OKR_SEED_KEY_2}:snapshot:2`,
    title: "Time to first value — Aug",
    value: 14,
    capturedAt: "2026-08-15T00:00:00.000Z",
  },
  {
    seedKey: `${DEMO_OKR_SEED_KEY_2}:snapshot:3`,
    title: "Time to first value — Sep",
    value: 12,
    capturedAt: "2026-09-22T00:00:00.000Z",
  },
];

async function seedDemoOkr(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
) {
  const objectiveCatalogId = maps.nodeKeyToId.get("objective");
  if (!objectiveCatalogId) return;

  const existingObjective = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, objectiveCatalogId),
        eq(schema.nodes.title, DEMO_OKR_SEED_TITLE),
      ),
    )
    .limit(1);

  const krCatalogId = maps.nodeKeyToId.get("key_result");
  const contributesId = maps.edgeKeyToId.get("contributes_to");

  if (existingObjective.length === 0) {
    const roadmapCatalogId = maps.nodeKeyToId.get("roadmap");
    const [roadmap] = roadmapCatalogId
      ? await db
          .select({ id: schema.nodes.id })
          .from(schema.nodes)
          .where(
            and(
              eq(schema.nodes.teamspaceId, teamspaceId),
              eq(schema.nodes.nodeCatalogId, roadmapCatalogId),
            ),
          )
          .limit(1)
      : [];

    const [objective] = await db
      .insert(schema.nodes)
      .values({
        teamspaceId,
        nodeCatalogId: objectiveCatalogId,
        title: DEMO_OKR_SEED_TITLE,
        properties: {
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
        teamspaceId,
        edgeCatalogId: informsId,
        sourceNodeId: roadmap.id,
        targetNodeId: objective.id,
        properties: { seed: `${DEMO_OKR_SEED_KEY}:informs` },
      });
    }

    const kpiCatalogId = maps.nodeKeyToId.get("kpi");
    if (!krCatalogId || !kpiCatalogId) return;

    const [kr1] = await db
      .insert(schema.nodes)
      .values({
        teamspaceId,
        nodeCatalogId: krCatalogId,
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
      })
      .returning({ id: schema.nodes.id });

    const [kr2] = await db
      .insert(schema.nodes)
      .values({
        teamspaceId,
        nodeCatalogId: krCatalogId,
        title: "Onboarding completion rate improvement",
        properties: {
          baseline: 40,
          target: 70,
          current_value: 52,
          unit: "%",
          direction: "increase",
          status: "at_risk",
          seed: `${DEMO_OKR_SEED_KEY}:kr2`,
        },
      })
      .returning({ id: schema.nodes.id });

    const [kpi] = await db
      .insert(schema.nodes)
      .values({
        teamspaceId,
        nodeCatalogId: kpiCatalogId,
        title: "Workspace creation rate",
        properties: {
          baseline: 10,
          target: 25,
          unit: "%",
          cadence: "weekly",
          direction: "increase",
          status: "active",
          current_value: 21,
          seed: `${DEMO_OKR_SEED_KEY}:kpi`,
        },
      })
      .returning({ id: schema.nodes.id });

    if (contributesId) {
      for (const kr of [kr1, kr2]) {
        if (!kr?.id) continue;
        await db.insert(schema.edges).values({
          teamspaceId,
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
        teamspaceId,
        edgeCatalogId: measuredById,
        sourceNodeId: kr1.id,
        targetNodeId: kpi.id,
        properties: { seed: `${DEMO_OKR_SEED_KEY}:measured_by` },
      });
    }

    const objectiveMeasuredById = maps.edgeKeyToId.get("measured_by");
    if (kpi?.id && objectiveMeasuredById) {
      await db.insert(schema.edges).values({
        teamspaceId,
        edgeCatalogId: objectiveMeasuredById,
        sourceNodeId: objective.id,
        targetNodeId: kpi.id,
        properties: { seed: `${DEMO_OKR_SEED_KEY}:measured_by:objective` },
      });
    }
  }

  const workspaceKpiId = await findKpiBySeed(
    db,
    teamspaceId,
    maps,
    `${DEMO_OKR_SEED_KEY}:kpi`,
  );
  if (workspaceKpiId) {
    await ensureMetricSnapshots(
      db,
      teamspaceId,
      maps,
      workspaceKpiId,
      DEMO_OKR_WORKSPACE_SNAPSHOTS,
    );
  }

  const existingObjective2 = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, objectiveCatalogId),
        eq(schema.nodes.title, DEMO_OKR_SEED_TITLE_2),
      ),
    )
    .limit(1);

  if (existingObjective2.length === 0) {
    const [objective2] = await db
      .insert(schema.nodes)
      .values({
        teamspaceId,
        nodeCatalogId: objectiveCatalogId,
        title: DEMO_OKR_SEED_TITLE_2,
        properties: {
          period: "Q3 2026",
          priority: "medium",
          status: "at_risk",
          seed: DEMO_OKR_SEED_KEY_2,
        },
      })
      .returning({ id: schema.nodes.id });

    if (objective2?.id && krCatalogId && contributesId) {
      const [kr3] = await db
        .insert(schema.nodes)
        .values({
          teamspaceId,
          nodeCatalogId: krCatalogId,
          title: "Reduce time-to-first-value under 10 minutes",
          properties: {
            baseline: 18,
            target: 10,
            current_value: 14,
            unit: "min",
            direction: "decrease",
            status: "at_risk",
            seed: `${DEMO_OKR_SEED_KEY_2}:kr1`,
          },
        })
        .returning({ id: schema.nodes.id });

      if (kr3?.id) {
        await db.insert(schema.edges).values({
          teamspaceId,
          edgeCatalogId: contributesId,
          sourceNodeId: kr3.id,
          targetNodeId: objective2.id,
          properties: { seed: `${DEMO_OKR_SEED_KEY_2}:contributes_to` },
        });
      }

      const kpiCatalogId = maps.nodeKeyToId.get("kpi");
      const objective2MeasuredById = maps.edgeKeyToId.get("measured_by");
      if (kpiCatalogId) {
        const [onboardingKpi] = await db
          .insert(schema.nodes)
          .values({
            teamspaceId,
            nodeCatalogId: kpiCatalogId,
            title: "Time to first value",
            properties: {
              baseline: 20,
              target: 10,
              unit: "min",
              cadence: "weekly",
              direction: "decrease",
              status: "active",
              current_value: 12,
              seed: `${DEMO_OKR_SEED_KEY_2}:kpi`,
            },
          })
          .returning({ id: schema.nodes.id });

        if (onboardingKpi?.id && objective2MeasuredById) {
          await db.insert(schema.edges).values({
            teamspaceId,
            edgeCatalogId: objective2MeasuredById,
            sourceNodeId: objective2.id,
            targetNodeId: onboardingKpi.id,
            properties: {
              seed: `${DEMO_OKR_SEED_KEY_2}:measured_by:objective`,
            },
          });
        }
      }
    }
  }

  const onboardingKpiId = await findKpiBySeed(
    db,
    teamspaceId,
    maps,
    `${DEMO_OKR_SEED_KEY_2}:kpi`,
  );
  let resolvedOnboardingKpiId = onboardingKpiId;

  if (!resolvedOnboardingKpiId) {
    const [objective2ForKpi] = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.teamspaceId, teamspaceId),
          eq(schema.nodes.nodeCatalogId, objectiveCatalogId),
          eq(schema.nodes.title, DEMO_OKR_SEED_TITLE_2),
        ),
      )
      .limit(1);

    const kpiCatalogId = maps.nodeKeyToId.get("kpi");
    const fallbackMeasuredById = maps.edgeKeyToId.get("measured_by");
    if (objective2ForKpi?.id && kpiCatalogId) {
      const [onboardingKpi] = await db
        .insert(schema.nodes)
        .values({
          teamspaceId,
          nodeCatalogId: kpiCatalogId,
          title: "Time to first value",
          properties: {
            baseline: 20,
            target: 10,
            unit: "min",
            cadence: "weekly",
            direction: "decrease",
            status: "active",
            current_value: 12,
            seed: `${DEMO_OKR_SEED_KEY_2}:kpi`,
          },
        })
        .returning({ id: schema.nodes.id });

      if (onboardingKpi?.id && fallbackMeasuredById) {
        await db.insert(schema.edges).values({
          teamspaceId,
          edgeCatalogId: fallbackMeasuredById,
          sourceNodeId: objective2ForKpi.id,
          targetNodeId: onboardingKpi.id,
          properties: {
            seed: `${DEMO_OKR_SEED_KEY_2}:measured_by:objective`,
          },
        });
      }
      resolvedOnboardingKpiId = onboardingKpi?.id ?? null;
    }
  }

  if (resolvedOnboardingKpiId) {
    await ensureMetricSnapshots(
      db,
      teamspaceId,
      maps,
      resolvedOnboardingKpiId,
      DEMO_OKR_ONBOARDING_SNAPSHOTS,
    );
  }

  const [objective2Row] = await db
    .select({ id: schema.nodes.id, properties: schema.nodes.properties })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodes.nodeCatalogId, objectiveCatalogId),
        eq(schema.nodes.title, DEMO_OKR_SEED_TITLE_2),
      ),
    )
    .limit(1);

  if (objective2Row) {
    const props = (objective2Row.properties ?? {}) as Record<string, unknown>;
    const { lifecycleStatus: _legacy, ...rest } = props;
    await db
      .update(schema.nodes)
      .set({
        properties: {
          ...rest,
          period: "Q3 2026",
        },
      })
      .where(eq(schema.nodes.id, objective2Row.id));
  }

  await ensureDemoKpiCurrentValues(db, teamspaceId, maps);
}

const DEMO_KPI_CURRENT_VALUES: Array<{ seedSuffix: string; currentValue: number }> =
  [
    { seedSuffix: `${DEMO_OKR_SEED_KEY}:kpi`, currentValue: 21 },
    { seedSuffix: `${DEMO_OKR_SEED_KEY_2}:kpi`, currentValue: 12 },
  ];

async function ensureDemoKpiCurrentValues(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
) {
  const kpiCatalogId = maps.nodeKeyToId.get("kpi");
  if (!kpiCatalogId) return;

  for (const { seedSuffix, currentValue } of DEMO_KPI_CURRENT_VALUES) {
    const [row] = await db
      .select({ id: schema.nodes.id, properties: schema.nodes.properties })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.teamspaceId, teamspaceId),
          eq(schema.nodes.nodeCatalogId, kpiCatalogId),
          sql`${schema.nodes.properties}->>'seed' = ${seedSuffix}`,
        ),
      )
      .limit(1);
    if (!row) continue;

    const props = (row.properties ?? {}) as Record<string, unknown>;
    if (props.current_value === currentValue) continue;

    await db
      .update(schema.nodes)
      .set({
        properties: {
          ...props,
          current_value: currentValue,
        },
      })
      .where(eq(schema.nodes.id, row.id));
  }
}

async function seedDemoUiComponents(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  maps: CatalogMaps,
) {
  const uiCatalogId = maps.nodeKeyToId.get("ui_component");
  const composedOfId = maps.edgeKeyToId.get("composed_of");
  if (!uiCatalogId) return;

  const buttonSource = `import { Button } from "./components/ui/button";

export default function Component() {
  return <Button>Button</Button>;
}
`;

  const buttonFiles = {
    "Component.tsx": buttonSource,
    "components/ui/button.tsx": `import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground",
);

type ButtonProps = React.ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, ...props }: ButtonProps) {
  return <BaseButton className={cn(buttonVariants(), className)} {...props} />;
}
`,
    "lib/utils.ts": `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
  };

  const buttonProperties = {
    slug: "demo-button",
    tier: "primitive" as const,
    representation: "source" as const,
    contentSchemaVersion: 2 as const,
    entry: "Component.tsx",
    fileKeys: Object.keys(buttonFiles),
    files: buttonFiles,
    lifecycleStatus: "Active",
    seed: `${DEMO_UI_COMPONENT_SEED_KEY}:button`,
  };

  const existingButton = await db
    .select({ id: schema.nodes.id, properties: schema.nodes.properties })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
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
        teamspaceId,
        nodeCatalogId: uiCatalogId,
        title: "Demo Button",
        properties: buttonProperties,
      })
      .returning({ id: schema.nodes.id });
    buttonId = button?.id;
  } else {
    const existingProps = existingButton[0]?.properties as { seed?: string };
    if (existingProps?.seed === `${DEMO_UI_COMPONENT_SEED_KEY}:button`) {
      await db
        .update(schema.nodes)
        .set({ properties: buttonProperties })
        .where(eq(schema.nodes.id, buttonId));
    } else {
      const representation = (
        existingButton[0]?.properties as { representation?: string }
      )?.representation;
      if (representation !== "source") {
        await db
          .update(schema.nodes)
          .set({ properties: buttonProperties })
          .where(eq(schema.nodes.id, buttonId));
      }
    }
  }

  if (!buttonId) return;

  const cardSource = `import { Button } from "./components/ui/button";

export default function Component() {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <Button>Button</Button>
    </div>
  );
}
`;

  const cardFiles = {
    "Component.tsx": cardSource,
    "components/ui/button.tsx": buttonFiles["components/ui/button.tsx"],
    "lib/utils.ts": buttonFiles["lib/utils.ts"],
  };

  const cardProperties = {
    slug: "demo-card",
    tier: "composite" as const,
    representation: "source" as const,
    contentSchemaVersion: 2 as const,
    entry: "Component.tsx",
    fileKeys: Object.keys(cardFiles),
    files: cardFiles,
    lifecycleStatus: "Active",
    seed: `${DEMO_UI_COMPONENT_SEED_KEY}:card`,
  };

  const existingCard = await db
    .select({ id: schema.nodes.id, properties: schema.nodes.properties })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
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
        teamspaceId,
        nodeCatalogId: uiCatalogId,
        title: "Demo Card",
        properties: cardProperties,
      })
      .returning({ id: schema.nodes.id });
    cardId = card?.id;
  } else {
    const existingProps = existingCard[0]?.properties as { seed?: string };
    if (existingProps?.seed === `${DEMO_UI_COMPONENT_SEED_KEY}:card`) {
      await db
        .update(schema.nodes)
        .set({ properties: cardProperties })
        .where(eq(schema.nodes.id, cardId));
    } else {
      const representation = (
        existingCard[0]?.properties as { representation?: string }
      )?.representation;
      if (representation !== "source") {
        await db
          .update(schema.nodes)
          .set({ properties: cardProperties })
          .where(eq(schema.nodes.id, cardId));
      }
    }
  }

  if (!cardId || !composedOfId) return;

  const existingEdge = await db
    .select({ id: schema.edges.id })
    .from(schema.edges)
    .where(
      and(
        eq(schema.edges.teamspaceId, teamspaceId),
        eq(schema.edges.edgeCatalogId, composedOfId),
        eq(schema.edges.sourceNodeId, cardId),
        eq(schema.edges.targetNodeId, buttonId),
      ),
    )
    .limit(1);

  if (existingEdge.length === 0) {
    await db.insert(schema.edges).values({
      teamspaceId,
      edgeCatalogId: composedOfId,
      sourceNodeId: cardId,
      targetNodeId: buttonId,
      properties: { seed: `${DEMO_UI_COMPONENT_SEED_KEY}:composed_of` },
    });
  }
}

async function seedInitiativeScopedNodes(
  db: ReturnType<typeof createDb>["db"],
  teamspaceId: string,
  initiativeId: string,
  maps: CatalogMaps,
) {
  const forInitiativeId = maps.edgeKeyToId.get("for_initiative");
  const scopedSeeds = [
    { catalogKey: "prd" as const, title: "Smoke PRD", status: "draft" },
    { catalogKey: "feature" as const, title: "Smoke feature", status: "draft" },
  ];

  for (const seed of scopedSeeds) {
    const nodeCatalogId = maps.nodeKeyToId.get(seed.catalogKey);
    if (!nodeCatalogId) continue;

    const existing = await db
      .select({ id: schema.nodes.id, properties: schema.nodes.properties })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.teamspaceId, teamspaceId),
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
          teamspaceId,
          nodeCatalogId,
          title: seed.title,
          properties: {
            lifecycleStatus: "Draft",
            status: seed.status,
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}${seed.catalogKey}`,
          },
        })
        .returning({ id: schema.nodes.id });
      nodeId = row?.id;
    } else {
      const props =
        existing[0]?.properties && typeof existing[0].properties === "object"
          ? (existing[0].properties as Record<string, unknown>)
          : {};
      await db
        .update(schema.nodes)
        .set({
          properties: {
            ...props,
            status: seed.status,
          },
        })
        .where(eq(schema.nodes.id, nodeId));
    }

    if (!nodeId || !forInitiativeId) continue;

    const edgeExisting = await db
      .select({ id: schema.edges.id })
      .from(schema.edges)
      .where(
        and(
          eq(schema.edges.teamspaceId, teamspaceId),
          eq(schema.edges.edgeCatalogId, forInitiativeId),
          eq(schema.edges.sourceNodeId, nodeId),
          eq(schema.edges.targetNodeId, initiativeId),
        ),
      )
      .limit(1);

    if (edgeExisting.length === 0) {
      await db.insert(schema.edges).values({
        teamspaceId,
        edgeCatalogId: forInitiativeId,
        sourceNodeId: nodeId,
        targetNodeId: initiativeId,
        properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}for_initiative` },
      });
    }
  }

  const featureNode = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .innerJoin(schema.nodeCatalog, eq(schema.nodes.nodeCatalogId, schema.nodeCatalog.id))
    .where(
      and(
        eq(schema.nodes.teamspaceId, teamspaceId),
        eq(schema.nodeCatalog.key, "feature"),
        eq(schema.nodes.title, "Smoke feature"),
      ),
    )
    .limit(1);

  const spawnsStoryId = maps.edgeKeyToId.get("spawns_story");
  const storyCatalogId = maps.nodeKeyToId.get("user_story");
  if (featureNode[0]?.id && spawnsStoryId && storyCatalogId) {
    const storyTitle = "Smoke story";
    const existingStory = await db
      .select({ id: schema.nodes.id, properties: schema.nodes.properties })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.teamspaceId, teamspaceId),
          eq(schema.nodes.nodeCatalogId, storyCatalogId),
          eq(schema.nodes.title, storyTitle),
        ),
      )
      .limit(1);

    let storyId = existingStory[0]?.id;
    if (!storyId) {
      const [row] = await db
        .insert(schema.nodes)
        .values({
          teamspaceId,
          nodeCatalogId: storyCatalogId,
          title: storyTitle,
          properties: {
            lifecycleStatus: "Draft",
            status: "draft",
            seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}user_story`,
          },
        })
        .returning({ id: schema.nodes.id });
      storyId = row?.id;
    } else {
      const props =
        existingStory[0]?.properties && typeof existingStory[0].properties === "object"
          ? (existingStory[0].properties as Record<string, unknown>)
          : {};
      await db
        .update(schema.nodes)
        .set({
          properties: {
            ...props,
            status: "draft",
          },
        })
        .where(eq(schema.nodes.id, storyId));
    }

    if (storyId) {
      const storyEdge = await db
        .select({ id: schema.edges.id })
        .from(schema.edges)
        .where(
          and(
            eq(schema.edges.teamspaceId, teamspaceId),
            eq(schema.edges.edgeCatalogId, spawnsStoryId),
            eq(schema.edges.sourceNodeId, featureNode[0].id),
            eq(schema.edges.targetNodeId, storyId),
          ),
        )
        .limit(1);

      if (storyEdge.length === 0) {
        await db.insert(schema.edges).values({
          teamspaceId,
          edgeCatalogId: spawnsStoryId,
          sourceNodeId: featureNode[0].id,
          targetNodeId: storyId,
          properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}spawns_story` },
        });
      }

      const partOfId = maps.edgeKeyToId.get("part_of");
      if (partOfId) {
        const partOfEdge = await db
          .select({ id: schema.edges.id })
          .from(schema.edges)
          .where(
            and(
              eq(schema.edges.teamspaceId, teamspaceId),
              eq(schema.edges.edgeCatalogId, partOfId),
              eq(schema.edges.sourceNodeId, storyId),
              eq(schema.edges.targetNodeId, featureNode[0].id),
            ),
          )
          .limit(1);

        if (partOfEdge.length === 0) {
          await db.insert(schema.edges).values({
            teamspaceId,
            edgeCatalogId: partOfId,
            sourceNodeId: storyId,
            targetNodeId: featureNode[0].id,
            properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}part_of` },
          });
        }
      }

      if (forInitiativeId) {
        const initiativeEdge = await db
          .select({ id: schema.edges.id })
          .from(schema.edges)
          .where(
            and(
              eq(schema.edges.teamspaceId, teamspaceId),
              eq(schema.edges.edgeCatalogId, forInitiativeId),
              eq(schema.edges.sourceNodeId, storyId),
              eq(schema.edges.targetNodeId, initiativeId),
            ),
          )
          .limit(1);

        if (initiativeEdge.length === 0) {
          await db.insert(schema.edges).values({
            teamspaceId,
            edgeCatalogId: forInitiativeId,
            sourceNodeId: storyId,
            targetNodeId: initiativeId,
            properties: { seed: `${GRAPH_SEED_IDEMPOTENCY_PREFIX}for_initiative` },
          });
        }
      }
    }
  }
}
