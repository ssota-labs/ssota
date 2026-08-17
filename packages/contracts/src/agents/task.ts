import { z } from "zod";
import { ExecutorTypeSchema } from "../shared/definitions.js";
import { ExecutionDirectiveSchema } from "./execution-directive.js";

export const TaskStatusSchema = z.enum([
  "pending",
  "ready",
  "running",
  "blocked",
  "done",
  "cancelled",
  "failed",
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  agentDefinitionId: z.string().uuid().nullable(),
  title: z.string().min(1),
  status: TaskStatusSchema,
  executorType: ExecutorTypeSchema,
  assignee: z.string().nullable(),
  subjectId: z.string().nullable(),
  targetNodeId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  sourceActionLogId: z.string().uuid().nullable(),
  context: z.record(z.unknown()).default({}),
  acceptanceCriteria: z.array(z.unknown()).default([]),
  idempotencyKey: z.string().nullable(),
  sandboxEnvironmentId: z.string().uuid().nullable().optional(),
  result: z.record(z.unknown()).default({}),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskIndexSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: TaskStatusSchema,
  agentDefinitionId: z.string().uuid().nullable(),
  assignee: z.string().nullable(),
  executorType: ExecutorTypeSchema,
  targetNodeId: z.string().uuid().nullable(),
  updatedAt: z.string(),
});

export type TaskIndex = z.infer<typeof TaskIndexSchema>;

export const QueryTasksInputSchema = z.object({
  status: TaskStatusSchema.optional(),
  agentDefinitionId: z.string().uuid().optional(),
  assignee: z.string().optional(),
  subjectId: z.string().optional(),
  targetNodeId: z.string().uuid().optional(),
  executorType: ExecutorTypeSchema.optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type QueryTasksInput = z.infer<typeof QueryTasksInputSchema>;

export const GetTaskInputSchema = z.object({
  taskId: z.string().uuid(),
});

export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;

export const SpawnTaskInputSchema = z.object({
  title: z.string().min(1),
  agentDefinitionId: z.string().uuid(),
  assignee: z.string().optional(),
  subjectId: z.string().optional(),
  targetNodeId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  executorType: ExecutorTypeSchema.optional(),
  context: z
    .object({
      executionDirective: ExecutionDirectiveSchema,
    })
    .passthrough()
    .optional(),
  acceptanceCriteria: z.array(z.unknown()).min(1).optional(),
  idempotencyKey: z.string().optional(),
  status: TaskStatusSchema.optional(),
});

export type SpawnTaskInput = z.infer<typeof SpawnTaskInputSchema>;

export const UpdateTaskPatchSchema = z.object({
  title: z.string().min(1).optional(),
  status: TaskStatusSchema.optional(),
  assignee: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  targetNodeId: z.string().uuid().nullable().optional(),
  executorType: ExecutorTypeSchema.optional(),
  context: z.record(z.unknown()).optional(),
  acceptanceCriteria: z.array(z.unknown()).optional(),
  result: z.record(z.unknown()).optional(),
  sandboxEnvironmentId: z.string().uuid().nullable().optional(),
});

export type UpdateTaskPatch = z.infer<typeof UpdateTaskPatchSchema>;

export const UpdateTaskInputSchema = z
  .object({
    taskId: z.string().uuid(),
  })
  .merge(UpdateTaskPatchSchema)
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => key !== "taskId" && value[key as keyof typeof value] !== undefined,
      ),
    { message: "At least one field to update is required" },
  );

export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const CreateTaskEffectPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  agentDefinitionId: z.string().uuid(),
  assignee: z.string().optional(),
  subjectId: z.string().optional(),
  targetNodeId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  executorType: ExecutorTypeSchema.optional(),
  context: z.record(z.unknown()).optional(),
  acceptanceCriteria: z.array(z.unknown()).optional(),
  idempotencyKey: z.string().optional(),
  status: TaskStatusSchema.optional(),
});

export type CreateTaskEffectPayload = z.infer<typeof CreateTaskEffectPayloadSchema>;
