import {
  NeighborQueryResponseSchema,
  NodeListResponseSchema,
  NodeResponseSchema,
  QueryNeighborsInputSchema,
  QueryNodesInputSchema,
  type NeighborQueryResult,
  type Node,
  type QueryNeighborsInput,
  type QueryNodesInput,
} from "@loopos/contracts";
import type { HttpClient } from "../http.js";

export function createNodesApi(http: HttpClient) {
  return {
    async get(nodeId: string): Promise<Node | null> {
      const result = await http.get(
        `/nodes/${nodeId}`,
        NodeResponseSchema,
      );
      return result.data;
    },

    async query(params: Partial<QueryNodesInput> = {}): Promise<Node[]> {
      const parsed = QueryNodesInputSchema.parse(params);
      const result = await http.get("/nodes", NodeListResponseSchema, {
        nodeType: parsed.nodeType,
        lifecycleStatus: parsed.lifecycleStatus,
        limit: parsed.limit,
        offset: parsed.offset,
      });
      return result.data;
    },

    async queryNeighbors(
      params: QueryNeighborsInput,
    ): Promise<NeighborQueryResult> {
      const parsed = QueryNeighborsInputSchema.parse(params);
      const result = await http.get(
        `/nodes/${parsed.nodeId}/neighbors`,
        NeighborQueryResponseSchema,
        {
          direction: parsed.direction,
          edgeType: parsed.edgeType,
        },
      );
      return result.data;
    },
  };
}
