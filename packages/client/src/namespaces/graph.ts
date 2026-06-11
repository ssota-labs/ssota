import {
  GraphTraversalResponseSchema,
  TraverseGraphInputSchema,
  type GraphTraversalResult,
  type TraverseGraphInput,
} from "@loopos/contracts";
import type { HttpClient } from "../http.js";

export function createGraphApi(http: HttpClient) {
  return {
    async traverse(params: TraverseGraphInput): Promise<GraphTraversalResult> {
      const parsed = TraverseGraphInputSchema.parse(params);
      const result = await http.get("/graph/traverse", GraphTraversalResponseSchema, {
        startNodeId: parsed.startNodeId,
        maxHops: parsed.maxHops,
        direction: parsed.direction,
        edgeTypes: parsed.edgeTypes,
        nodeTypes: parsed.nodeTypes,
        limit: parsed.limit,
      });
      return result.data;
    },
  };
}
