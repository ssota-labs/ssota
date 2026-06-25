import {
  getEdgeTypeEntry,
  getNodeTypeEntry,
  isKnownNodeType,
  listEdgeTypes,
  listNodeTypes,
  parseNodeProperties,
  rankCatalogCandidates,
  type CatalogSearchCandidate,
  type EdgeCatalogRow,
  type NodeCatalogRow,
} from "@ssota/contracts";
import type { CatalogReadPort } from "../ports/catalog-read-port.js";

/** In-memory catalog for tests — mirrors contracts SSOT with synthetic UUIDs. */
export function createContractsCatalogReadPort(): CatalogReadPort {
  const nodeRows: NodeCatalogRow[] = listNodeTypes().map((key, index) => {
    const entry = getNodeTypeEntry(key)!;
    return {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      projectId: "00000000-0000-4000-8000-000000000000",
      key,
      label: entry.label,
      description: entry.description,
      keywords: entry.keywords,
      propertySchema: { type: "object" },
    };
  });

  const edgeRows: EdgeCatalogRow[] = listEdgeTypes().map((key, index) => {
    const entry = getEdgeTypeEntry(key)!;
    return {
      id: `00000000-0000-4000-9000-${String(index + 1).padStart(12, "0")}`,
      projectId: "00000000-0000-4000-8000-000000000000",
      key,
      label: entry.label,
      description: entry.description,
      keywords: entry.keywords,
      domainCatalogIds: [],
      rangeCatalogIds: [],
      propertySchema: null,
    };
  });

  const nodeByKey = new Map(nodeRows.map((r) => [r.key, r]));
  const nodeById = new Map(nodeRows.map((r) => [r.id, r]));
  const edgeByKey = new Map(edgeRows.map((r) => [r.key, r]));
  const edgeById = new Map(edgeRows.map((r) => [r.id, r]));

  return {
    listNodeCatalog: async () => [...nodeRows],
    getNodeCatalogById: async (id) => nodeById.get(id) ?? null,
    getNodeCatalogByKey: async (key) => nodeByKey.get(key) ?? null,
    listEdgeCatalog: async () => [...edgeRows],
    getEdgeCatalogById: async (id) => edgeById.get(id) ?? null,
    getEdgeCatalogByKey: async (key) => edgeByKey.get(key) ?? null,
    async searchCatalog(input) {
      const candidates: CatalogSearchCandidate[] = [];
      if (input.kind !== "edge") {
        for (const r of nodeRows) {
          candidates.push({
            kind: "node",
            key: r.key,
            label: r.label,
            description: r.description,
            keywords: r.keywords,
          });
        }
      }
      if (input.kind !== "node") {
        for (const r of edgeRows) {
          candidates.push({
            kind: "edge",
            key: r.key,
            label: r.label,
            description: r.description,
            keywords: r.keywords,
          });
        }
      }
      return rankCatalogCandidates(input.query, candidates, input.limit);
    },
    validateNodeProperties(catalogKey, properties) {
      if (!isKnownNodeType(catalogKey)) {
        throw new Error(`UNKNOWN_NODE_TYPE:${catalogKey}`);
      }
      return parseNodeProperties(catalogKey, properties);
    },
    validateEdgeProperties(_catalogKey, properties) {
      return (properties ?? {}) as Record<string, unknown>;
    },
  };
}
