import {
  EdgeListResponseSchema,
  TraverseEdgesInputSchema,
  type Edge,
  type TraverseEdgesInput,
} from "@ssota/contracts";
import type { HttpClient } from "../http.js";

export interface TraverseEdgesParams
  extends Omit<TraverseEdgesInput, "nodeId"> {
  nodeId: string;
}

export function createEdgesApi(http: HttpClient) {
  return {
    async traverse(params: TraverseEdgesParams): Promise<Edge[]> {
      const parsed = TraverseEdgesInputSchema.parse(params);
      const result = await http.get(
        `/nodes/${parsed.nodeId}/edges`,
        EdgeListResponseSchema,
        {
          direction: parsed.direction,
          edgeType: parsed.edgeType,
        },
      );
      return result.data;
    },
  };
}
