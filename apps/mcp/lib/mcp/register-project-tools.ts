import { z } from "zod";
import {
  GetTaskInputSchema,
  QueryTasksInputSchema,
  SpawnTaskInputSchema,
  UpdateTaskInputSchema,
} from "@ssota/contracts";
import {
  getTask,
  listTasks,
  queryTasks,
  spawnTask,
  updateTask,
  mapTaskError,
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
        targetNodeId: z.string().uuid().optional(),
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

  registerScopedProjectTool(
    server,
    "spawn_task",
    {
      title: "Spawn Task",
      description:
        "Create a development workflow task. workflowKey must exist in the contracts workflow registry.",
      inputSchema: {
        title: z.string().min(1),
        workflowKey: z.string().min(1),
        assignee: z.string().optional(),
        subjectId: z.string().optional(),
        targetNodeId: z.string().uuid().optional(),
        parentTaskId: z.string().uuid().optional(),
        executorType: z.enum(["Agent", "Human", "System"]).optional(),
        context: z.record(z.unknown()).optional(),
        acceptanceCriteria: z.array(z.unknown()).optional(),
        idempotencyKey: z.string().optional(),
      },
    },
    async ({ projectId, args }) => {
      try {
        const parsed = SpawnTaskInputSchema.parse(args);
        return jsonContent(await spawnTask(projectId, parsed));
      } catch (error) {
        const mapped = mapTaskError(error);
        if (mapped) {
          const body = await mapped.json();
          throw new Error(`${body.code}: ${body.message}`);
        }
        throw error;
      }
    },
  );

  registerScopedProjectTool(
    server,
    "update_task",
    {
      title: "Update Task",
      description: "Patch a development workflow task (status, result, context, etc.)",
      inputSchema: {
        taskId: z.string().uuid(),
        title: z.string().min(1).optional(),
        status: z
          .enum(["pending", "ready", "running", "blocked", "done", "cancelled", "failed"])
          .optional(),
        assignee: z.string().nullable().optional(),
        subjectId: z.string().nullable().optional(),
        targetNodeId: z.string().uuid().nullable().optional(),
        executorType: z.enum(["Agent", "Human", "System"]).optional(),
        context: z.record(z.unknown()).optional(),
        acceptanceCriteria: z.array(z.unknown()).optional(),
        result: z.record(z.unknown()).optional(),
      },
    },
    async ({ projectId, args }) => {
      try {
        const parsed = UpdateTaskInputSchema.parse(args);
        return jsonContent(await updateTask(projectId, parsed));
      } catch (error) {
        const mapped = mapTaskError(error);
        if (mapped) {
          const body = await mapped.json();
          throw new Error(`${body.code}: ${body.message}`);
        }
        throw error;
      }
    },
  );
}
