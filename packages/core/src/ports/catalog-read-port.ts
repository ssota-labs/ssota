import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts";

export interface CatalogReadPort {
  listNodeCatalog(): Promise<NodeCatalogRow[]>;
  getNodeCatalogById(id: string): Promise<NodeCatalogRow | null>;
  getNodeCatalogByKey(key: string): Promise<NodeCatalogRow | null>;
  listEdgeCatalog(): Promise<EdgeCatalogRow[]>;
  getEdgeCatalogById(id: string): Promise<EdgeCatalogRow | null>;
  getEdgeCatalogByKey(key: string): Promise<EdgeCatalogRow | null>;
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
