import { z } from "zod";
import {
  ActionScopeSchema,
  EffectSchema,
  ExecutorTypeSchema,
  GateStatusSchema,
  InstructionScopeSchema,
  InstructionWorkflowStepSchema,
  LifecycleStatusSchema,
  NodeFamilySchema,
  NodeTypeDefinitionSchema,
  EdgeTypeDefinitionSchema,
  PropertyDefinitionSchema,
  PermissionOperationSchema,
  PermissionTypeSchema,
  ExecuteActionResultSchema,
  ActionPreviewResultSchema,
} from "./definitions.js";

/** ISO-8601 timestamp string on the wire (JSON-serialized Date). */
export const IsoDateTimeSchema = z.string().min(1);

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ArchetypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  family: NodeFamilySchema,
  typicalValues: z.record(z.unknown()),
  allowedMutations: z.array(z.string()),
});

export type Archetype = z.infer<typeof ArchetypeSchema>;

export const NodeCatalogEntrySchema = NodeTypeDefinitionSchema.extend({
  slug: z.string().min(1),
  label: z.string().min(1),
  propertyRefs: z.array(z.string()).default([]),
  allowedActionRefs: z.array(z.string()).default([]),
});

export type NodeCatalogEntry = z.infer<typeof NodeCatalogEntrySchema>;

export const EdgeCatalogEntrySchema = EdgeTypeDefinitionSchema.extend({
  slug: z.string().min(1),
  label: z.string().min(1),
});

export type EdgeCatalogEntry = z.infer<typeof EdgeCatalogEntrySchema>;

export const PropertyCatalogEntrySchema = PropertyDefinitionSchema;

export type PropertyCatalogEntry = z.infer<typeof PropertyCatalogEntrySchema>;

export const ActionCatalogEntrySchema = z.object({
  actionType: z.string(),
  slug: z.string().min(1),
  label: z.string().min(1),
  scope: ActionScopeSchema,
  preconditions: z.record(z.unknown()),
  effects: z.array(EffectSchema),
  executor: ExecutorTypeSchema,
  allowedLifecycleTransitions: z.record(z.array(LifecycleStatusSchema)),
  failureMode: z.string(),
  idempotencyRule: z.string().nullable(),
  logPayloadSchema: z.record(z.unknown()),
});

export type ActionCatalogEntry = z.infer<typeof ActionCatalogEntrySchema>;

export const ActionPropertyPermissionSchema = z.object({
  actionType: z.string(),
  nodeType: z.string(),
  propertyKey: z.string(),
  operation: PermissionOperationSchema,
  permissionType: PermissionTypeSchema,
  valueConstraint: z.record(z.unknown()).nullable(),
  requiresHumanGate: z.boolean(),
  status: z.string(),
});

export type ActionPropertyPermission = z.infer<
  typeof ActionPropertyPermissionSchema
>;

export const InstructionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string(),
  triggerPatterns: z.array(z.string()),
  applicableNodeTypes: z.array(z.string()),
  requiredActions: z.array(z.string()),
  optionalActions: z.array(z.string()),
  lifecycle: LifecycleStatusSchema,
  body: z.string(),
  scope: InstructionScopeSchema,
  triggers: z.array(z.string()),
  workflowSteps: z.array(InstructionWorkflowStepSchema),
  allowedActions: z.array(z.string()),
  outputContract: z.record(z.unknown()),
  gatePolicy: z.record(z.unknown()),
  completionCriteria: z.string().nullable(),
});

export type Instruction = z.infer<typeof InstructionSchema>;

export const NodeSchema = z.object({
  id: z.string().uuid(),
  nodeType: z.string(),
  lifecycleStatus: LifecycleStatusSchema,
  properties: z.record(z.unknown()),
  content: z.string().nullable(),
  contentUrl: z.string().nullable(),
  provenance: z.record(z.unknown()),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type Node = z.infer<typeof NodeSchema>;

export const EdgeSchema = z.object({
  id: z.string().uuid(),
  edgeType: z.string(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  properties: z.record(z.unknown()),
  createdAt: IsoDateTimeSchema,
});

export type Edge = z.infer<typeof EdgeSchema>;

export const GateSchema = z.object({
  id: z.string().uuid(),
  actionType: z.string(),
  executorId: z.string(),
  input: z.record(z.unknown()),
  proposedEffects: z.array(EffectSchema),
  status: GateStatusSchema,
  reason: z.string(),
  createdAt: IsoDateTimeSchema,
  decisionNote: z.string().nullable(),
});

export type Gate = z.infer<typeof GateSchema>;

export const ActionLogRecordSchema = z.object({
  id: z.string().uuid(),
  actionType: z.string(),
  executorId: z.string(),
  executorType: ExecutorTypeSchema,
  input: z.record(z.unknown()),
  effects: z.array(EffectSchema),
  outcome: z.enum(["committed", "gated", "rejected"]),
  rejectionReason: z.string().nullable(),
  gateId: z.string().uuid().nullable(),
  idempotencyKey: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: IsoDateTimeSchema,
});

export type ActionLogRecord = z.infer<typeof ActionLogRecordSchema>;

/** Client-facing action input — executor fields are server-derived. */
export const ExecuteActionClientInputSchema = z.object({
  actionType: z.string(),
  input: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().optional(),
});

export type ExecuteActionClientInput = z.infer<
  typeof ExecuteActionClientInputSchema
>;

export const ActionPreviewClientInputSchema = ExecuteActionClientInputSchema;

export type ActionPreviewClientInput = z.infer<
  typeof ActionPreviewClientInputSchema
>;

export const SubmitForApprovalClientInputSchema = z.object({
  note: z.string().optional(),
});

export type SubmitForApprovalClientInput = z.infer<
  typeof SubmitForApprovalClientInputSchema
>;

export const ListResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
  });

export const SingleResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: itemSchema.nullable(),
  });

export const NodeListResponseSchema = ListResponseSchema(NodeSchema);
export const EdgeListResponseSchema = ListResponseSchema(EdgeSchema);
export const GateListResponseSchema = ListResponseSchema(GateSchema);
export const ActionLogListResponseSchema = ListResponseSchema(
  ActionLogRecordSchema,
);
export const InstructionListResponseSchema = ListResponseSchema(
  InstructionSchema,
);
export const NodeCatalogListResponseSchema = ListResponseSchema(
  NodeCatalogEntrySchema,
);
export const EdgeCatalogListResponseSchema = ListResponseSchema(
  EdgeCatalogEntrySchema,
);
export const PropertyCatalogListResponseSchema = ListResponseSchema(
  PropertyCatalogEntrySchema,
);
export const ActionCatalogListResponseSchema = ListResponseSchema(
  ActionCatalogEntrySchema,
);
export const ArchetypeListResponseSchema = ListResponseSchema(ArchetypeSchema);

export const ActionContractResponseSchema = SingleResponseSchema(
  ActionCatalogEntrySchema,
);

export const ExecuteActionResponseSchema = z.object({
  data: ExecuteActionResultSchema,
});

export const ActionPreviewResponseSchema = z.object({
  data: ActionPreviewResultSchema,
});

export const SubmitForApprovalResponseSchema = z.object({
  data: z.object({
    message: z.string(),
    gate: GateSchema.nullable(),
  }),
});
