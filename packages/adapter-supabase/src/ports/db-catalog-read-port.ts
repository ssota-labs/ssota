import { and, eq } from "drizzle-orm";
import edgeCatalogSeed from "@ssota/contracts/seed-packs/software-development-workflow/edge-catalog.json" with {
  type: "json",
};
import {
  getEdgeTypeEntry,
  getNodeTypeEntry,
  isKnownNodeType,
  listEdgeTypes,
  listNodeTypes,
  parseNodeProperties,
  type EdgeCatalogRow,
  type NodeCatalogRow,
} from "@ssota/contracts";
import type { CatalogReadPort } from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export interface DbCatalogScope {
  projectId: string;
}

type EdgeCatalogSeedEntry = {
  key: string;
  label: string;
  domainKeys?: string[];
  rangeKeys?: string[];
};

const edgeCatalogSeedByKey = new Map(
  (edgeCatalogSeed as EdgeCatalogSeedEntry[]).map((entry) => [entry.key, entry]),
);

function resolveNodeCatalogIds(
  keys: string[] | undefined,
  nodeKeyToId: Map<string, string>,
): string[] {
  if (!keys?.length) return [];
  return keys.map((key) => {
    const id = nodeKeyToId.get(key);
    if (!id) {
      throw new Error(`Unknown node catalog key for edge domain/range: ${key}`);
    }
    return id;
  });
}

function mapNodeCatalogRow(
  row: typeof schema.nodeCatalog.$inferSelect,
): NodeCatalogRow {
  return {
    id: row.id,
    projectId: row.projectId,
    key: row.key,
    label: row.label,
    propertySchema: row.propertySchema ?? {},
  };
}

function mapEdgeCatalogRow(
  row: typeof schema.edgeCatalog.$inferSelect,
): EdgeCatalogRow {
  return {
    id: row.id,
    projectId: row.projectId,
    key: row.key,
    label: row.label,
    domainCatalogIds: row.domainCatalogIds ?? [],
    rangeCatalogIds: row.rangeCatalogIds ?? [],
    propertySchema: row.propertySchema ?? null,
  };
}

export function createDbCatalogReadPort(
  db: Db,
  scope: DbCatalogScope,
): CatalogReadPort {
  const { projectId } = scope;

  return {
    async listNodeCatalog() {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(eq(schema.nodeCatalog.projectId, projectId));
      return rows.map(mapNodeCatalogRow);
    },
    async getNodeCatalogById(id) {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(
          and(
            eq(schema.nodeCatalog.projectId, projectId),
            eq(schema.nodeCatalog.id, id),
          ),
        )
        .limit(1);
      return rows[0] ? mapNodeCatalogRow(rows[0]) : null;
    },
    async getNodeCatalogByKey(key) {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(
          and(
            eq(schema.nodeCatalog.projectId, projectId),
            eq(schema.nodeCatalog.key, key),
          ),
        )
        .limit(1);
      return rows[0] ? mapNodeCatalogRow(rows[0]) : null;
    },
    async listEdgeCatalog() {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(eq(schema.edgeCatalog.projectId, projectId));
      return rows.map(mapEdgeCatalogRow);
    },
    async getEdgeCatalogById(id) {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(
          and(
            eq(schema.edgeCatalog.projectId, projectId),
            eq(schema.edgeCatalog.id, id),
          ),
        )
        .limit(1);
      return rows[0] ? mapEdgeCatalogRow(rows[0]) : null;
    },
    async getEdgeCatalogByKey(key) {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(
          and(
            eq(schema.edgeCatalog.projectId, projectId),
            eq(schema.edgeCatalog.key, key),
          ),
        )
        .limit(1);
      return rows[0] ? mapEdgeCatalogRow(rows[0]) : null;
    },
    validateNodeProperties(catalogKey, properties) {
      if (isKnownNodeType(catalogKey)) {
        return parseNodeProperties(catalogKey, properties);
      }
      return (properties ?? {}) as Record<string, unknown>;
    },
    validateEdgeProperties(_catalogKey, properties) {
      return (properties ?? {}) as Record<string, unknown>;
    },
  };
}

/** Seed dev-workflow catalog rows for a project (idempotent). */
export async function seedDomainCatalog(
  db: Db,
  projectId: string,
): Promise<{ nodeKeyToId: Map<string, string>; edgeKeyToId: Map<string, string> }> {
  const nodeKeyToId = new Map<string, string>();
  const edgeKeyToId = new Map<string, string>();

  for (const key of listNodeTypes()) {
    const entry = getNodeTypeEntry(key)!;
    const existing = await db
      .select({ id: schema.nodeCatalog.id })
      .from(schema.nodeCatalog)
      .where(
        and(
          eq(schema.nodeCatalog.projectId, projectId),
          eq(schema.nodeCatalog.key, key),
        ),
      )
      .limit(1);
    if (existing[0]) {
      nodeKeyToId.set(key, existing[0].id);
      continue;
    }
    const [row] = await db
      .insert(schema.nodeCatalog)
      .values({
        projectId,
        key,
        label: entry.label,
        propertySchema: { type: "object" },
      })
      .returning({ id: schema.nodeCatalog.id });
    nodeKeyToId.set(key, row!.id);
  }

  for (const key of listEdgeTypes()) {
    const entry = getEdgeTypeEntry(key)!;
    const seedEntry = edgeCatalogSeedByKey.get(key);
    const domainCatalogIds = resolveNodeCatalogIds(
      seedEntry?.domainKeys,
      nodeKeyToId,
    );
    const rangeCatalogIds = resolveNodeCatalogIds(
      seedEntry?.rangeKeys,
      nodeKeyToId,
    );
    const existing = await db
      .select({ id: schema.edgeCatalog.id })
      .from(schema.edgeCatalog)
      .where(
        and(
          eq(schema.edgeCatalog.projectId, projectId),
          eq(schema.edgeCatalog.key, key),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(schema.edgeCatalog)
        .set({
          domainCatalogIds,
          rangeCatalogIds,
          label: entry.label,
        })
        .where(eq(schema.edgeCatalog.id, existing[0].id));
      edgeKeyToId.set(key, existing[0].id);
      continue;
    }
    const [row] = await db
      .insert(schema.edgeCatalog)
      .values({
        projectId,
        key,
        label: entry.label,
        domainCatalogIds,
        rangeCatalogIds,
        propertySchema: null,
      })
      .returning({ id: schema.edgeCatalog.id });
    edgeKeyToId.set(key, row!.id);
  }

  for (const reserved of [
    { key: "page", label: "페이지 정의" },
    { key: "workspace", label: "워크스페이스 네비" },
  ]) {
    const existing = await db
      .select({ id: schema.nodeCatalog.id })
      .from(schema.nodeCatalog)
      .where(
        and(
          eq(schema.nodeCatalog.projectId, projectId),
          eq(schema.nodeCatalog.key, reserved.key),
        ),
      )
      .limit(1);
    if (existing[0]) {
      nodeKeyToId.set(reserved.key, existing[0].id);
      continue;
    }
    const [row] = await db
      .insert(schema.nodeCatalog)
      .values({
        projectId,
        key: reserved.key,
        label: reserved.label,
        propertySchema: { type: "object" },
      })
      .returning({ id: schema.nodeCatalog.id });
    nodeKeyToId.set(reserved.key, row!.id);
  }

  return { nodeKeyToId, edgeKeyToId };
}
