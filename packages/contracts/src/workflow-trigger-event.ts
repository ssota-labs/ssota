import { z } from "zod";

/** Structured workflow trigger — always event-based (manual included). */
export const WorkflowTriggerEventSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
});

export type WorkflowTriggerEvent = z.infer<typeof WorkflowTriggerEventSchema>;

export function createManualWorkflowTrigger(
  id = "manual",
): WorkflowTriggerEvent {
  return { id, kind: "manual", enabled: true, config: {} };
}

/** Normalize persisted instruction.triggers (legacy string[] or structured events). */
export function normalizeInstructionTriggerEvents(
  raw: unknown,
): WorkflowTriggerEvent[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [createManualWorkflowTrigger()];
  }

  return raw.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `legacy_${index}_${item}`,
        kind: item,
        enabled: true,
        config: {},
      };
    }
    return WorkflowTriggerEventSchema.parse(item);
  });
}

export const WorkflowTriggerSpecSchema = z.object({
  events: z.array(WorkflowTriggerEventSchema).min(1),
});

export type WorkflowTriggerSpec = z.infer<typeof WorkflowTriggerSpecSchema>;
