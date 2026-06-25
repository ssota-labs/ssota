import type {
  CatalogSearchHit,
  CatalogSearchInput,
  EdgeCatalogRow,
  NodeCatalogRow,
} from "@ssota/contracts";

export interface CatalogReadPort {
  listNodeCatalog(): Promise<NodeCatalogRow[]>;
  getNodeCatalogById(id: string): Promise<NodeCatalogRow | null>;
  getNodeCatalogByKey(key: string): Promise<NodeCatalogRow | null>;
  listEdgeCatalog(): Promise<EdgeCatalogRow[]>;
  getEdgeCatalogById(id: string): Promise<EdgeCatalogRow | null>;
  getEdgeCatalogByKey(key: string): Promise<EdgeCatalogRow | null>;
  /**
   * Keyword/type search over the catalog (node + edge types). Returns
   * lightweight hits ordered best-first; fetch full detail with
   * getNodeCatalogByKey / getEdgeCatalogByKey. The matching backend
   * (ILIKE → FTS → vector) is an implementation detail.
   */
  searchCatalog(input: CatalogSearchInput): Promise<CatalogSearchHit[]>;
  validateNodeProperties(
    catalogKey: string,
    properties: unknown,
  ): Record<string, unknown>;
  validateEdgeProperties(
    catalogKey: string,
    properties: unknown,
  ): Record<string, unknown>;
}

export type { NodeCatalogRow, EdgeCatalogRow };
