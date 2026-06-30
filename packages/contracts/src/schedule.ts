import { z } from "zod";

export const ScheduleTargetTypeSchema = z.enum([
  "main_heartbeat",
  "agent",
  "ready_task_dispatch",
]);

export type ScheduleTargetType = z.infer<typeof ScheduleTargetTypeSchema>;

export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  agentDefinitionId: z.string().uuid(),
  targetType: ScheduleTargetTypeSchema,
  cronExpression: z.string().min(1),
  timezone: z.string().min(1),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Schedule = z.infer<typeof ScheduleSchema>;
