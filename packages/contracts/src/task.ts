import { z } from "zod";
import { ExecutorTypeSchema } from "./definitions.js";
import { WorkflowKeySchema } from "./workflow.js";

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
  projectId: z.string().uuid(),
  workflowKey: WorkflowKeySchema,
  workflowId: z.string().uuid().nullable(),
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
  workflowKey: WorkflowKeySchema,
  assignee: z.string().nullable(),
  executorType: ExecutorTypeSchema,
  targetNodeId: z.string().uuid().nullable(),
  updatedAt: z.string(),
});

export type TaskIndex = z.infer<typeof TaskIndexSchema>;

export const QueryTasksInputSchema = z.object({
  status: TaskStatusSchema.optional(),
  workflowKey: WorkflowKeySchema.optional(),
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
  workflowKey: WorkflowKeySchema,
  targetNodeId: z.string().uuid().optional(),
  assignee: z.string().optional(),
  subjectId: z.string().optional(),
  parentTaskId: z.string().uuid().optional(),
  executorType: ExecutorTypeSchema.optional(),
  context: z.record(z.unknown()).optional(),
  acceptanceCriteria: z.array(z.unknown()).optional(),
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
  workflowKey: WorkflowKeySchema,
  workflowId: z.string().uuid().nullable().optional(),
  status: TaskStatusSchema.optional(),
  executorType: ExecutorTypeSchema.optional(),
  assignee: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  targetNodeId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  context: z.record(z.unknown()).optional(),
  acceptanceCriteria: z.array(z.unknown()).optional(),
});

export type CreateTaskEffectPayload = z.infer<typeof CreateTaskEffectPayloadSchema>;
