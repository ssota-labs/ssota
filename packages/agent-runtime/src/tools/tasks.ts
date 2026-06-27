import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { ExecutionDirectiveSchema, SpawnTaskInputSchema } from "@ssota/contracts";
import { serializeTask, spawnTask, updateTask } from "@ssota/core";
import { getGraphReadPort, getTaskPort, getWorkflowInstructionPort } from "../ports.js";
import { getRunContext } from "./context.js";

function taskDeps(teamspaceId: string, accountId?: string) {
  return {
    tasks: getTaskPort(teamspaceId, accountId),
    graphRead: getGraphReadPort(teamspaceId, accountId),
    workflowInstructions: getWorkflowInstructionPort(teamspaceId, accountId),
  };
}

export function createTaskTools(): ToolSet {
  return {
    get_task: tool({
      description: "Fetch a task by id (defaults to the current run's task).",
      inputSchema: z.object({ taskId: z.string().uuid().optional() }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const task = await getTaskPort(ctx.teamspaceId, ctx.accountId).getTask(
          input.taskId ?? ctx.taskId ?? "",
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
        const tasks = await getTaskPort(ctx.teamspaceId, ctx.accountId).queryTasks(input);
        return tasks.map(serializeTask);
      },
    }),

    spawn_task: tool({
      description:
        "Create a follow-up task with a full delegation directive. Required: title, workflowInstructionKey (or id), executionDirective (goal, background, steps), acceptanceCriteria.",
      inputSchema: z.object({
        title: z.string(),
        workflowInstructionId: z.string().uuid().optional(),
        workflowInstructionKey: z.string().optional(),
        targetNodeId: z.string().uuid().optional(),
        executionDirective: ExecutionDirectiveSchema,
        acceptanceCriteria: z.array(z.unknown()).min(1),
        idempotencyKey: z.string().optional(),
        status: z
          .enum(["pending", "ready", "running", "blocked", "done", "cancelled", "failed"])
          .optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const parsed = SpawnTaskInputSchema.parse({
          title: input.title,
          workflowInstructionId: input.workflowInstructionId,
          workflowInstructionKey: input.workflowInstructionKey,
          targetNodeId: input.targetNodeId,
          acceptanceCriteria: input.acceptanceCriteria,
          idempotencyKey: input.idempotencyKey,
          status: input.status ?? "ready",
          parentTaskId: ctx.taskId || undefined,
          context: { executionDirective: input.executionDirective },
        });
        const task = await spawnTask(
          taskDeps(ctx.teamspaceId, ctx.accountId),
          ctx.teamspaceId,
          parsed,
        );
        return serializeTask(task);
      },
    }),

    update_task: tool({
      description: "Update fields on a task (defaults to current run's task).",
      inputSchema: z.object({
        taskId: z.string().uuid().optional(),
        title: z.string().optional(),
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
        context: z.record(z.unknown()).optional(),
        acceptanceCriteria: z.array(z.unknown()).optional(),
        result: z.record(z.unknown()).optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const { taskId, ...patch } = input;
        const resolvedTaskId = taskId ?? ctx.taskId;
        if (!resolvedTaskId) {
          throw new Error("taskId is required");
        }
        const task = await updateTask(taskDeps(ctx.teamspaceId, ctx.accountId), ctx.teamspaceId, {
          taskId: resolvedTaskId,
          ...patch,
        });
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
        if (!ctx.taskId) {
          throw new Error("taskId is required for complete_task");
        }
        const task = await updateTask(taskDeps(ctx.teamspaceId, ctx.accountId), ctx.teamspaceId, {
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
        if (!ctx.taskId) {
          throw new Error("taskId is required for block_task");
        }
        const task = await updateTask(taskDeps(ctx.teamspaceId, ctx.accountId), ctx.teamspaceId, {
          taskId: ctx.taskId,
          status: "blocked",
          context: { blockedReason: input.reason },
        });
        return serializeTask(task);
      },
    }),

    request_approval: tool({
      description:
        "Pause for a human approval gate before a risky or irreversible action.",
      inputSchema: z.object({
        reason: z.string().describe("What needs approval and why."),
        summary: z.string().optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        if (!ctx.taskId) {
          throw new Error("taskId is required for request_approval");
        }
        const gate = {
          id: globalThis.crypto.randomUUID(),
          policy: "human_approval",
          required: true,
          reason: input.reason,
          ...(input.summary ? { summary: input.summary } : {}),
          requestedAt: new Date().toISOString(),
        };
        const task = await updateTask(taskDeps(ctx.teamspaceId, ctx.accountId), ctx.teamspaceId, {
          taskId: ctx.taskId,
          status: "blocked",
          context: { gate },
        });
        return { gateRequested: true, gate, task: serializeTask(task) };
      },
    }),
  };
}
