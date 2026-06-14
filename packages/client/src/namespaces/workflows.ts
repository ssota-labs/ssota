import {
  FindWorkflowInputSchema,
  WorkflowListResponseSchema,
  WorkflowResponseSchema,
  type FindWorkflowInput,
  type WorkflowWire,
} from "@ssota/contracts";
import type { HttpClient } from "../http.js";

export function createWorkflowsApi(http: HttpClient) {
  return {
    async find(params: FindWorkflowInput): Promise<WorkflowWire[]> {
      const parsed = FindWorkflowInputSchema.parse(params);
      const result = await http.get(
        "/workflows/search",
        WorkflowListResponseSchema,
        {
          query: parsed.query,
          nodeType: parsed.nodeType,
          limit: parsed.limit,
        },
      );
      return result.data;
    },

    async get(workflowId: string): Promise<WorkflowWire | null> {
      const result = await http.get(
        `/workflows/${workflowId}`,
        WorkflowResponseSchema,
      );
      return result.data;
    },
  };
}
