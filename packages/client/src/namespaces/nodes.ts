import {
  NodeListResponseSchema,
  QueryNodesInputSchema,
  type Node,
  type QueryNodesInput,
} from "@loopos/contracts";
import type { HttpClient } from "../http.js";

export function createNodesApi(http: HttpClient) {
  return {
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
  };
}
