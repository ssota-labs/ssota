import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts";

export interface CatalogWritePort {
  upsertNodeCatalog(entry: Omit<NodeCatalogRow, "id" | "projectId"> & { id?: string }): Promise<NodeCatalogRow>;
  upsertEdgeCatalog(entry: Omit<EdgeCatalogRow, "id" | "projectId"> & { id?: string }): Promise<EdgeCatalogRow>;
  deleteNodeCatalog(id: string): Promise<void>;
  deleteEdgeCatalog(id: string): Promise<void>;
}
