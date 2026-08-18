import { and, eq, sql } from "drizzle-orm";
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
  type CatalogKind,
  type CatalogSearchHit,
  type EdgeCatalogRow,
  type NodeCatalogRow,
  type NodeType,
  type EdgeType,
} from "@ssota/contracts";
import type { CatalogReadPort } from "@ssota/core";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import type { GraphPortsScope } from "./graph-read-port.js";

export type DbCatalogScope = Pick<GraphPortsScope, "organizationId">;

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
    organizationId: row.organizationId,
    key: row.key,
    label: row.label,
    description: row.description ?? "",
    keywords: row.keywords ?? [],
    propertySchema: row.propertySchema ?? {},
  };
}

function mapEdgeCatalogRow(
  row: typeof schema.edgeCatalog.$inferSelect,
): EdgeCatalogRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    key: row.key,
    label: row.label,
    description: row.description ?? "",
    keywords: row.keywords ?? [],
    domainCatalogIds: row.domainCatalogIds ?? [],
    rangeCatalogIds: row.rangeCatalogIds ?? [],
    propertySchema: row.propertySchema ?? null,
  };
}

async function searchCatalogTable(
  db: Db,
  tableName: string,
  kind: CatalogKind,
  organizationId: string,
  query: string,
  limit: number,
): Promise<CatalogSearchHit[]> {
  const like = `%${query}%`;
  const table = sql.identifier(tableName);
  const rows = (await db.execute(sql`
    select key, label, description,
      ts_rank(search_tsv, websearch_to_tsquery('simple', ${query})) as rank
    from ${table}
    where organization_id = ${organizationId}
      and (
        search_tsv @@ websearch_to_tsquery('simple', ${query})
        or key ilike ${like}
        or label ilike ${like}
        or description ilike ${like}
        or exists (select 1 from unnest(keywords) kw where kw ilike ${like})
      )
    order by rank desc, label asc
    limit ${limit}
  `)) as unknown as Array<{
    key: string;
    label: string;
    description: string | null;
    rank: number | string;
  }>;
  return rows.map((row) => ({
    kind,
    key: row.key,
    label: row.label,
    snippet: row.description && row.description.length > 0 ? row.description : row.label,
    score: typeof row.rank === "number" ? row.rank : Number(row.rank) || 0,
  }));
}

export function createDbCatalogReadPort(
  db: Db,
  scope: DbCatalogScope,
): CatalogReadPort {
  const { organizationId } = scope;

  return {
    async listNodeCatalog() {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(eq(schema.nodeCatalog.organizationId, organizationId));
      return rows.map(mapNodeCatalogRow);
    },
    async getNodeCatalogById(id) {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(
          and(
            eq(schema.nodeCatalog.organizationId, organizationId),
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
            eq(schema.nodeCatalog.organizationId, organizationId),
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
        .where(eq(schema.edgeCatalog.organizationId, organizationId));
      return rows.map(mapEdgeCatalogRow);
    },
    async getEdgeCatalogById(id) {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(
          and(
            eq(schema.edgeCatalog.organizationId, organizationId),
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
            eq(schema.edgeCatalog.organizationId, organizationId),
            eq(schema.edgeCatalog.key, key),
          ),
        )
        .limit(1);
      return rows[0] ? mapEdgeCatalogRow(rows[0]) : null;
    },
    async searchCatalog(input) {
      const hits: CatalogSearchHit[] = [];
      if (input.kind !== "edge") {
        hits.push(
          ...(await searchCatalogTable(
            db,
            "node_catalog",
            "node",
            organizationId,
            input.query,
            input.limit,
          )),
        );
      }
      if (input.kind !== "node") {
        hits.push(
          ...(await searchCatalogTable(
            db,
            "edge_catalog",
            "edge",
            organizationId,
            input.query,
            input.limit,
          )),
        );
      }
      return hits
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
        .slice(0, input.limit);
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

/**
 * Seed an organization's catalog rows (idempotent). Type labels/schemas are
 * resolved from the embedded catalog pack.
 */
export async function seedDomainCatalog(
  db: Db,
  organizationId: string,
  opts?: { nodeTypeKeys?: string[]; edgeTypeKeys?: string[] },
): Promise<{ nodeKeyToId: Map<string, string>; edgeKeyToId: Map<string, string> }> {
  const nodeKeyToId = new Map<string, string>();
  const edgeKeyToId = new Map<string, string>();
  const nodeTypeKeys = (opts?.nodeTypeKeys ?? listNodeTypes()) as NodeType[];
  const edgeTypeKeys = (opts?.edgeTypeKeys ?? listEdgeTypes()) as EdgeType[];

  for (const key of nodeTypeKeys) {
    const entry = getNodeTypeEntry(key)!;
    const existing = await db
      .select({ id: schema.nodeCatalog.id })
      .from(schema.nodeCatalog)
      .where(
        and(
          eq(schema.nodeCatalog.organizationId, organizationId),
          eq(schema.nodeCatalog.key, key),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(schema.nodeCatalog)
        .set({ description: entry.description, keywords: entry.keywords })
        .where(eq(schema.nodeCatalog.id, existing[0].id));
      nodeKeyToId.set(key, existing[0].id);
      continue;
    }
    const [row] = await db
      .insert(schema.nodeCatalog)
      .values({
        organizationId,
        key,
        label: entry.label,
        description: entry.description,
        keywords: entry.keywords,
        propertySchema: { type: "object" },
      })
      .returning({ id: schema.nodeCatalog.id });
    nodeKeyToId.set(key, row!.id);
  }

  for (const key of edgeTypeKeys) {
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
          eq(schema.edgeCatalog.organizationId, organizationId),
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
          description: entry.description,
          keywords: entry.keywords,
        })
        .where(eq(schema.edgeCatalog.id, existing[0].id));
      edgeKeyToId.set(key, existing[0].id);
      continue;
    }
    const [row] = await db
      .insert(schema.edgeCatalog)
      .values({
        organizationId,
        key,
        label: entry.label,
        description: entry.description,
        keywords: entry.keywords,
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
          eq(schema.nodeCatalog.organizationId, organizationId),
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
        organizationId,
        key: reserved.key,
        label: reserved.label,
        propertySchema: { type: "object" },
      })
      .returning({ id: schema.nodeCatalog.id });
    nodeKeyToId.set(reserved.key, row!.id);
  }

  return { nodeKeyToId, edgeKeyToId };
}
