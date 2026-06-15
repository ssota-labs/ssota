import { z } from "zod";
import {
  GetTaskInputSchema,
  QueryTasksInputSchema,
} from "@ssota/contracts";
import {
  getTask,
  listTasks,
  queryTasks,
} from "@/lib/api/services";
import { jsonContent } from "@/lib/mcp/json-content";
import { registerScopedProjectTool } from "@/lib/mcp/register-scoped-tool";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

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

export function registerProjectTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "list_tasks",
    {
      title: "List Tasks",
      description:
        "Discover: list development workflow tasks for the current project. Fetch details with get_task or filter via query_tasks.",
      inputSchema: { limit: z.number().int().positive().max(100).optional() },
    },
    async ({ projectId, args }) => {
      const limit = typeof args.limit === "number" ? args.limit : undefined;
      return jsonContent(await listTasks(projectId, limit));
    },
  );

  registerScopedProjectTool(
    server,
    "get_task",
    {
      title: "Get Task",
      description: "Fetch one development workflow task by taskId",
      inputSchema: { taskId: z.string().uuid() },
    },
    async ({ projectId, args }) => {
      const parsed = GetTaskInputSchema.parse(args);
      return jsonContent(await getTask(projectId, parsed));
    },
  );

  registerScopedProjectTool(
    server,
    "query_tasks",
    {
      title: "Query Tasks",
      description: "Query development workflow tasks with optional filters and pagination",
      inputSchema: {
        status: z
          .enum(["pending", "ready", "running", "blocked", "done", "cancelled", "failed"])
          .optional(),
        workflowKey: z.string().min(1).optional(),
        assignee: z.string().optional(),
        subjectId: z.string().optional(),
        executorType: z.enum(["Agent", "Human", "System"]).optional(),
        limit: z.number().int().positive().max(100).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async ({ projectId, args }) => {
      const parsed = QueryTasksInputSchema.parse(args);
      return jsonContent(await queryTasks(projectId, parsed));
    },
  );
}
