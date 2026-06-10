import { z } from "zod";

export const LifecycleStatusSchema = z.enum([
  "Draft",
  "Active",
  "Archived",
  "Deleted",
]);

export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;

export const ExecutorTypeSchema = z.enum(["Agent", "Human", "System"]);

export type ExecutorType = z.infer<typeof ExecutorTypeSchema>;

export const NodeFamilySchema = z.enum(["document", "operational"]);

export type NodeFamily = z.infer<typeof NodeFamilySchema>;

export const PermissionOperationSchema = z.enum([
  "read",
  "write",
  "create",
  "delete",
]);

export type PermissionOperation = z.infer<typeof PermissionOperationSchema>;

export const PermissionTypeSchema = z.enum(["allow", "deny"]);

export type PermissionType = z.infer<typeof PermissionTypeSchema>;

export const GateStatusSchema = z.enum(["pending", "approved", "rejected"]);

export type GateStatus = z.infer<typeof GateStatusSchema>;

export const EffectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("create_node"),
    node: z.object({
      id: z.string().uuid().optional(),
      nodeType: z.string(),
      lifecycleStatus: LifecycleStatusSchema,
      properties: z.record(z.unknown()).default({}),
      content: z.string().nullable().optional(),
      contentUrl: z.string().url().nullable().optional(),
      provenance: z.record(z.unknown()).default({}),
    }),
  }),
  z.object({
    kind: z.literal("update_node"),
    nodeId: z.string().uuid(),
    patch: z.object({
      lifecycleStatus: LifecycleStatusSchema.optional(),
      properties: z.record(z.unknown()).optional(),
      content: z.string().nullable().optional(),
      contentUrl: z.string().url().nullable().optional(),
    }),
  }),
  z.object({
    kind: z.literal("create_edge"),
    edge: z.object({
      id: z.string().uuid().optional(),
      edgeType: z.string(),
      sourceNodeId: z.string().uuid(),
      targetNodeId: z.string().uuid(),
      properties: z.record(z.unknown()).default({}),
    }),
  }),
  z.object({
    kind: z.literal("update_gate"),
    gateId: z.string().uuid(),
    status: GateStatusSchema,
    decisionNote: z.string().optional(),
  }),
]);

export type Effect = z.infer<typeof EffectSchema>;

export const ActionLogEntrySchema = z.object({
  actionType: z.string(),
  executorId: z.string(),
  executorType: ExecutorTypeSchema,
  input: z.record(z.unknown()),
  effects: z.array(EffectSchema),
  outcome: z.enum(["committed", "gated", "rejected"]),
  rejectionReason: z.string().optional(),
  gateId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type ActionLogEntry = z.infer<typeof ActionLogEntrySchema>;

export const ExecuteActionInputSchema = z.object({
  actionType: z.string(),
  input: z.record(z.unknown()).default({}),
  executorId: z.string(),
  executorType: ExecutorTypeSchema,
  idempotencyKey: z.string().optional(),
});

export type ExecuteActionInput = z.infer<typeof ExecuteActionInputSchema>;

export const ExecuteActionResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("committed"),
    logId: z.string().uuid(),
    effects: z.array(EffectSchema),
  }),
  z.object({
    status: z.literal("gated"),
    gateId: z.string().uuid(),
    message: z.string(),
  }),
  z.object({
    status: z.literal("rejected"),
    reason: z.string(),
    code: z.string(),
  }),
]);

export type ExecuteActionResult = z.infer<typeof ExecuteActionResultSchema>;

export const QueryNodesInputSchema = z.object({
  nodeType: z.string().optional(),
  lifecycleStatus: LifecycleStatusSchema.optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type QueryNodesInput = z.infer<typeof QueryNodesInputSchema>;

export const TraverseEdgesInputSchema = z.object({
  nodeId: z.string().uuid(),
  direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
  edgeType: z.string().optional(),
});

export type TraverseEdgesInput = z.infer<typeof TraverseEdgesInputSchema>;

export const FindInstructionInputSchema = z.object({
  query: z.string().min(1),
  nodeType: z.string().optional(),
  limit: z.number().int().positive().max(20).default(5),
});

export type FindInstructionInput = z.infer<typeof FindInstructionInputSchema>;

export const GetActionLogInputSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  actionType: z.string().optional(),
});

export type GetActionLogInput = z.infer<typeof GetActionLogInputSchema>;

export const SubmitForApprovalInputSchema = z.object({
  gateId: z.string().uuid(),
  note: z.string().optional(),
});

export type SubmitForApprovalInput = z.infer<
  typeof SubmitForApprovalInputSchema
>;
