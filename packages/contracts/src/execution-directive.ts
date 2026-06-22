import { z } from "zod";

/** Delegation directive written into task.context at spawn time. */
export const ExecutionDirectiveSchema = z.object({
  goal: z.string().min(10),
  background: z.string().min(10),
  steps: z.array(z.string().min(3)).min(1),
  constraints: z.array(z.string()).default([]),
  contextRefs: z
    .object({
      nodeIds: z.array(z.string().uuid()).default([]),
      edgeIds: z.array(z.string().uuid()).default([]),
      taskIds: z.array(z.string().uuid()).default([]),
    })
    .default({ nodeIds: [], edgeIds: [], taskIds: [] }),
  notes: z.string().optional(),
});

export type ExecutionDirective = z.infer<typeof ExecutionDirectiveSchema>;

export const TaskContextSchema = z
  .object({
    executionDirective: ExecutionDirectiveSchema.optional(),
  })
  .passthrough();
