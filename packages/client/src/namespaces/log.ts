import {
  ActionLogEntryResponseSchema,
  ActionLogListResponseSchema,
  GetActionLogEntryInputSchema,
  GetActionLogInputSchema,
  type ActionLogRecord,
  type GetActionLogEntryInput,
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

    async getEntry(params: GetActionLogEntryInput): Promise<ActionLogRecord | null> {
      const parsed = GetActionLogEntryInputSchema.parse(params);
      const result = await http.get("/action-log/entry", ActionLogEntryResponseSchema, {
        logId: parsed.logId,
        idempotencyKey: parsed.idempotencyKey,
      });
      return result.data;
    },
  };
}
