import type {
  EdgeTypeCatalogEntry,
  Mutability,
  NodeTypeCatalogEntry,
} from "@ssota/contracts";

export interface CatalogReadPort {
  listNodeTypes(): NodeTypeCatalogEntry[];
  getNodeTypeEntry(nodeType: string): NodeTypeCatalogEntry | null;
  listEdgeTypes(): EdgeTypeCatalogEntry[];
  getEdgeTypeEntry(edgeType: string): EdgeTypeCatalogEntry | null;
  validateNodeProperties(
    nodeType: string,
    properties: unknown,
  ): Record<string, unknown>;
}

export type { NodeTypeCatalogEntry, EdgeTypeCatalogEntry, Mutability };
