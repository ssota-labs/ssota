import { z } from "zod";
import { throwMcpToolError } from "@/lib/api/mcp-errors";
import {
  createScheduleForMcp,
  listSchedulesForMcp,
} from "@/lib/api/schedule-services";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { jsonContent } from "@/lib/mcp/json-content";
import { registerScopedProjectTool } from "@/lib/mcp/register-scoped-tool";

type McpToolServer = {
  registerTool: (
    name: string,
    config: Record<string, unknown>,
    handler: (
      args: Record<string, unknown>,
      extra: { authInfo?: AuthInfo },
    ) => Promise<unknown>,
  ) => void;
};

export function registerScheduleTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "create_schedule",
    {
      title: "Create Schedule",
      description:
        "Give the environment a cron cadence: fire an agent on a schedule so it runs itself. The agent must exist (create_agent) and should allow the `schedule` (or `heartbeat`) trigger. cronExpression is standard 5/6-field cron evaluated in `timezone` (default Asia/Seoul), e.g. '0 9 * * *' = 09:00 daily. Typically the orchestrator's cadence.",
      inputSchema: {
        agentDefinitionId: z.string().uuid(),
        cronExpression: z.string().min(1),
        timezone: z.string().optional(),
        enabled: z.boolean().optional(),
        idempotencyPrefix: z.string().optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(await createScheduleForMcp(teamspaceId, args));
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );

  registerScopedProjectTool(
    server,
    "list_schedules",
    {
      title: "List Schedules",
      description:
        "List the project's schedules (agentDefinitionId, cronExpression, timezone, enabled).",
      inputSchema: {},
    },
    async ({ teamspaceId }) =>
      jsonContent(await listSchedulesForMcp(teamspaceId)),
  );
}
