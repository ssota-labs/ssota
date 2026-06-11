import {
  ActionCatalogListResponseSchema,
  ActionContractResponseSchema,
  ArchetypeListResponseSchema,
  EdgeCatalogListResponseSchema,
  NodeCatalogListResponseSchema,
  PropertyCatalogListResponseSchema,
  type ActionCatalogEntry,
  type Archetype,
  type EdgeCatalogEntry,
  type NodeCatalogEntry,
  type PropertyCatalogEntry,
} from "@loopos/contracts";
import type { HttpClient } from "../http.js";

export function createCatalogApi(http: HttpClient) {
  return {
    async listNodeTypes(): Promise<NodeCatalogEntry[]> {
      const result = await http.get(
        "/catalog/node-types",
        NodeCatalogListResponseSchema,
      );
      return result.data;
    },

    async listEdgeTypes(): Promise<EdgeCatalogEntry[]> {
      const result = await http.get(
        "/catalog/edge-types",
        EdgeCatalogListResponseSchema,
      );
      return result.data;
    },

    async listProperties(): Promise<PropertyCatalogEntry[]> {
      const result = await http.get(
        "/catalog/properties",
        PropertyCatalogListResponseSchema,
      );
      return result.data;
    },

    async listActionContracts(): Promise<ActionCatalogEntry[]> {
      const result = await http.get(
        "/catalog/action-contracts",
        ActionCatalogListResponseSchema,
      );
      return result.data;
    },

    async getActionContract(
      actionType: string,
    ): Promise<ActionCatalogEntry | null> {
      const result = await http.get(
        `/catalog/action-contracts/${encodeURIComponent(actionType)}`,
        ActionContractResponseSchema,
      );
      return result.data;
    },

    async listArchetypes(): Promise<Archetype[]> {
      const result = await http.get(
        "/catalog/archetypes",
        ArchetypeListResponseSchema,
      );
      return result.data;
    },
  };
}
