import {
  ActionPreviewClientInputSchema,
  ActionPreviewResponseSchema,
  ExecuteActionClientInputSchema,
  ExecuteActionResponseSchema,
  type ActionPreviewClientInput,
  type ActionPreviewResult,
  type ExecuteActionClientInput,
  type ExecuteActionResult,
} from "@loopos/contracts";
import type { HttpClient } from "../http.js";

export function createActionsApi(http: HttpClient) {
  return {
    async execute(
      params: ExecuteActionClientInput,
    ): Promise<ExecuteActionResult> {
      const body = ExecuteActionClientInputSchema.parse(params);
      const result = await http.post(
        "/actions/execute",
        body,
        ExecuteActionResponseSchema,
      );
      return result.data;
    },

    async preview(
      params: ActionPreviewClientInput,
    ): Promise<ActionPreviewResult> {
      const body = ActionPreviewClientInputSchema.parse(params);
      const result = await http.post(
        "/actions/preview",
        body,
        ActionPreviewResponseSchema,
      );
      return result.data;
    },
  };
}
