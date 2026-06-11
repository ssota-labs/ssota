import {
  ActionLogListResponseSchema,
  GetActionLogInputSchema,
  type ActionLogRecord,
  type GetActionLogInput,
} from "@loopos/contracts";
import type { HttpClient } from "../http.js";

export function createLogApi(http: HttpClient) {
  return {
    async list(params: Partial<GetActionLogInput> = {}): Promise<ActionLogRecord[]> {
      const parsed = GetActionLogInputSchema.parse(params);
      const result = await http.get("/action-log", ActionLogListResponseSchema, {
        limit: parsed.limit,
        offset: parsed.offset,
        actionType: parsed.actionType,
      });
      return result.data;
    },
  };
}
