import {
  ActionCatalogListResponseSchema,
  ActionContractResponseSchema,
  ArchetypeListResponseSchema,
  ArchetypeResponseSchema,
  EdgeCatalogEntryResponseSchema,
  EdgeCatalogListResponseSchema,
  NodeCatalogEntryResponseSchema,
  NodeCatalogListResponseSchema,
  PropertyCatalogEntryResponseSchema,
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

    async getNodeType(nodeType: string): Promise<NodeCatalogEntry | null> {
      const result = await http.get(
        `/catalog/node-types/${encodeURIComponent(nodeType)}`,
        NodeCatalogEntryResponseSchema,
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

    async getEdgeType(edgeType: string): Promise<EdgeCatalogEntry | null> {
      const result = await http.get(
        `/catalog/edge-types/${encodeURIComponent(edgeType)}`,
        EdgeCatalogEntryResponseSchema,
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

    async getProperty(propertyKey: string): Promise<PropertyCatalogEntry | null> {
      const result = await http.get(
        `/catalog/properties/${encodeURIComponent(propertyKey)}`,
        PropertyCatalogEntryResponseSchema,
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

    async getArchetype(archetypeId: string): Promise<Archetype | null> {
      const result = await http.get(
        `/catalog/archetypes/${encodeURIComponent(archetypeId)}`,
        ArchetypeResponseSchema,
      );
      return result.data;
    },
  };
}
