import { z } from "zod";
import {
  GetTaskInputSchema,
  QueryTasksInputSchema,
  SpawnTaskInputSchema,
  UpdateTaskInputSchema,
  ExecutionDirectiveSchema,
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
    async ({ teamspaceId, args }) => {
      const limit = typeof args.limit === "number" ? args.limit : undefined;
      return jsonContent(await listTasks(teamspaceId, limit));
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
    async ({ teamspaceId, args }) => {
      const parsed = GetTaskInputSchema.parse(args);
      return jsonContent(await getTask(teamspaceId, parsed));
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
        workflowInstructionId: z.string().uuid().optional(),
        workflowInstructionKey: z.string().optional(),
        assignee: z.string().optional(),
        subjectId: z.string().optional(),
        targetNodeId: z.string().uuid().optional(),
        executorType: z.enum(["Agent", "Human", "System"]).optional(),
        limit: z.number().int().positive().max(100).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      const parsed = QueryTasksInputSchema.parse(args);
      return jsonContent(await queryTasks(teamspaceId, parsed));
    },
  );

  registerScopedProjectTool(
    server,
    "spawn_task",
    {
      title: "Spawn Task",
      description:
        "Create a development workflow task. Requires workflowInstructionKey (or id), executionDirective, and acceptanceCriteria.",
      inputSchema: {
        title: z.string().min(1),
        workflowInstructionId: z.string().uuid().optional(),
        workflowInstructionKey: z.string().optional(),
        assignee: z.string().optional(),
        subjectId: z.string().optional(),
        targetNodeId: z.string().uuid().optional(),
        parentTaskId: z.string().uuid().optional(),
        executorType: z.enum(["Agent", "Human", "System"]).optional(),
        executionDirective: ExecutionDirectiveSchema,
        acceptanceCriteria: z.array(z.unknown()).min(1),
        idempotencyKey: z.string().optional(),
        status: z
          .enum(["pending", "ready", "running", "blocked", "done", "cancelled", "failed"])
          .optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        const parsed = SpawnTaskInputSchema.parse({
          ...args,
          context: args.executionDirective
            ? { executionDirective: args.executionDirective }
            : undefined,
        });
        return jsonContent(await spawnTask(teamspaceId, parsed));
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
    async ({ teamspaceId, args }) => {
      try {
        const parsed = UpdateTaskInputSchema.parse(args);
        return jsonContent(await updateTask(teamspaceId, parsed));
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
