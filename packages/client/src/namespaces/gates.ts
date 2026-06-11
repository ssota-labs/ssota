import {
  GateListResponseSchema,
  SubmitForApprovalClientInputSchema,
  SubmitForApprovalResponseSchema,
  type Gate,
  type SubmitForApprovalClientInput,
} from "@loopos/contracts";
import type { HttpClient } from "../http.js";

export function createGatesApi(http: HttpClient) {
  return {
    async listPending(): Promise<Gate[]> {
      const result = await http.get("/gates/pending", GateListResponseSchema);
      return result.data;
    },

    async submitForApproval(
      params: SubmitForApprovalClientInput & { gateId: string },
    ): Promise<{ message: string; gate: Gate | null }> {
      const { gateId, ...rest } = params;
      const body = SubmitForApprovalClientInputSchema.parse(rest);
      const result = await http.post(
        `/gates/${gateId}/submit`,
        body,
        SubmitForApprovalResponseSchema,
      );
      return result.data;
    },
  };
}
