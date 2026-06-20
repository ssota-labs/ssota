import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { serializeTask, spawnTask, updateTask } from "@ssota/core";
import { SpawnTaskInputSchema } from "@ssota/contracts";
import { getGraphReadPort, getTaskPort } from "../ports.js";
import { getRunContext } from "./context.js";

function taskDeps(projectId: string) {
  return {
    tasks: getTaskPort(projectId),
    graphRead: getGraphReadPort(projectId),
  };
}

export function createTaskTools(): ToolSet {
  return {
    get_task: tool({
      description: "Fetch a task by id (defaults to the current run's task).",
      inputSchema: z.object({ taskId: z.string().uuid().optional() }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const task = await getTaskPort(ctx.projectId).getTask(
          input.taskId ?? ctx.taskId,
        );
        return task ? serializeTask(task) : null;
      },
    }),

    query_tasks: tool({
      description: "List tasks in the project, optionally filtered by status.",
      inputSchema: z.object({
        status: z
          .enum([
            "pending",
            "ready",
            "running",
            "blocked",
            "done",
            "cancelled",
            "failed",
          ])
          .optional(),
        limit: z.number().int().positive().max(100).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const tasks = await getTaskPort(ctx.projectId).queryTasks(input);
        return tasks.map(serializeTask);
      },
    }),

    spawn_task: tool({
      description:
        "Create a follow-up task. workflowKey must be a registered workflow (e.g. work.implement_feature).",
      inputSchema: z.object({
        title: z.string(),
        workflowKey: z.string(),
        targetNodeId: z.string().uuid().optional(),
        context: z.record(z.unknown()).optional(),
        acceptanceCriteria: z.array(z.unknown()).optional(),
        idempotencyKey: z.string().optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const parsed = SpawnTaskInputSchema.parse({
          ...input,
          parentTaskId: ctx.taskId,
        });
        const task = await spawnTask(taskDeps(ctx.projectId), ctx.projectId, parsed);
        return serializeTask(task);
      },
    }),

    complete_task: tool({
      description:
        "Mark the current run's task done. Call this once the task's goal and acceptance criteria are satisfied.",
      inputSchema: z.object({
        summary: z.string().describe("Short summary of what was accomplished."),
        result: z.record(z.unknown()).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const task = await updateTask(taskDeps(ctx.projectId), ctx.projectId, {
          taskId: ctx.taskId,
          status: "done",
          result: { summary: input.summary, ...(input.result ?? {}) },
        });
        return serializeTask(task);
      },
    }),

    block_task: tool({
      description:
        "Mark the current run's task blocked when a human decision or missing input prevents completion.",
      inputSchema: z.object({
        reason: z.string().describe("Why the task is blocked."),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const task = await updateTask(taskDeps(ctx.projectId), ctx.projectId, {
          taskId: ctx.taskId,
          status: "blocked",
          context: { blockedReason: input.reason },
        });
        return serializeTask(task);
      },
    }),
  };
}
