import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts";

/** Search text (description/keywords) is optional on write — defaults to empty. */
export type UpsertNodeCatalogInput = Omit<
  NodeCatalogRow,
  "id" | "projectId" | "description" | "keywords"
> & { id?: string; description?: string; keywords?: string[] };

export type UpsertEdgeCatalogInput = Omit<
  EdgeCatalogRow,
  "id" | "projectId" | "description" | "keywords"
> & { id?: string; description?: string; keywords?: string[] };

export interface CatalogWritePort {
  upsertNodeCatalog(entry: UpsertNodeCatalogInput): Promise<NodeCatalogRow>;
  upsertEdgeCatalog(entry: UpsertEdgeCatalogInput): Promise<EdgeCatalogRow>;
  deleteNodeCatalog(id: string): Promise<void>;
  deleteEdgeCatalog(id: string): Promise<void>;
}
