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
