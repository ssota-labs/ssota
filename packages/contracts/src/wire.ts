import { z } from "zod";
import {
  ActionScopeSchema,
  EffectSchema,
  ExecutorTypeSchema,
  GateStatusSchema,
  ImpactQueueStatusSchema,
  LifecycleStatusSchema,
  NodeFamilySchema,
  NodeTypeDefinitionSchema,
  EdgeTypeDefinitionSchema,
  PropertySchemaSchema,
  PermissionOperationSchema,
  PermissionTypeSchema,
  ExecuteActionResultSchema,
  ActionPreviewResultSchema,
} from "./definitions.js";
import { WorkflowSchema } from "./workflow.js";
import { TaskIndexSchema, TaskSchema } from "./task.js";

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
  propertySchema: PropertySchemaSchema.default({}),
  allowedActionRefs: z.array(z.string()).default([]),
});

export type NodeCatalogEntry = z.infer<typeof NodeCatalogEntrySchema>;

export const EdgeCatalogEntrySchema = EdgeTypeDefinitionSchema.extend({
  slug: z.string().min(1),
  label: z.string().min(1),
});

export type EdgeCatalogEntry = z.infer<typeof EdgeCatalogEntrySchema>;

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

export const PropertyCatalogEntrySchema = z.object({
  propertyKey: z.string().min(1),
  valueType: z.string().min(1),
  constraints: z.record(z.unknown()).default({}),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  system: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  nodeTypes: z.array(z.string()).default([]),
});

export type PropertyCatalogEntry = z.infer<typeof PropertyCatalogEntrySchema>;

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

export const WorkflowWireSchema = WorkflowSchema.extend({
  renderedText: z.string().optional(),
});

export type WorkflowWire = z.infer<typeof WorkflowWireSchema>;

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

export const ImpactQueueItemSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  sourceActionLogId: z.string().uuid(),
  sourceNodeId: z.string().uuid().nullable(),
  targetNodeId: z.string().uuid().nullable(),
  dependencyEdgeId: z.string().uuid().nullable(),
  workflowKey: z.string().min(1),
  workflowId: z.string().uuid().nullable(),
  status: ImpactQueueStatusSchema,
  priority: z.number().int(),
  runAt: IsoDateTimeSchema,
  lockedBy: z.string().nullable(),
  lockedUntil: IsoDateTimeSchema.nullable(),
  attemptCount: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  idempotencyKey: z.string().min(1),
  lastError: z.string().nullable(),
  payload: z.record(z.unknown()),
  result: z.record(z.unknown()),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
});

export type ImpactQueueItem = z.infer<typeof ImpactQueueItemSchema>;

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
export const ImpactQueueListResponseSchema = ListResponseSchema(
  ImpactQueueItemSchema,
);
export const TaskListResponseSchema = ListResponseSchema(TaskSchema);
export const TaskIndexListResponseSchema = ListResponseSchema(TaskIndexSchema);
export const WorkflowListResponseSchema = ListResponseSchema(WorkflowWireSchema);
export const NodeCatalogListResponseSchema = ListResponseSchema(
  NodeCatalogEntrySchema,
);
export const EdgeCatalogListResponseSchema = ListResponseSchema(
  EdgeCatalogEntrySchema,
);
export const ActionCatalogListResponseSchema = ListResponseSchema(
  ActionCatalogEntrySchema,
);
export const ArchetypeListResponseSchema = ListResponseSchema(ArchetypeSchema);
export const PropertyCatalogListResponseSchema = ListResponseSchema(
  PropertyCatalogEntrySchema,
);

export const ActionContractResponseSchema = SingleResponseSchema(
  ActionCatalogEntrySchema,
);

export const NodeCatalogEntryResponseSchema = SingleResponseSchema(
  NodeCatalogEntrySchema,
);
export const EdgeCatalogEntryResponseSchema = SingleResponseSchema(
  EdgeCatalogEntrySchema,
);
export const ArchetypeResponseSchema = SingleResponseSchema(ArchetypeSchema);
export const PropertyCatalogEntryResponseSchema = SingleResponseSchema(
  PropertyCatalogEntrySchema,
);
export const NodeResponseSchema = SingleResponseSchema(NodeSchema);
export const WorkflowResponseSchema = SingleResponseSchema(WorkflowWireSchema);
export const GateResponseSchema = SingleResponseSchema(GateSchema);
export const ActionLogEntryResponseSchema = SingleResponseSchema(
  ActionLogRecordSchema,
);
export const ImpactQueueItemResponseSchema = SingleResponseSchema(
  ImpactQueueItemSchema,
);
export const TaskResponseSchema = SingleResponseSchema(TaskSchema);

export const NeighborQueryResponseSchema = z.object({
  data: z.object({
    nodeId: z.string().uuid(),
    edges: z.array(EdgeSchema),
    nodes: z.array(NodeSchema),
  }),
});

export type NeighborQueryResult = z.infer<
  typeof NeighborQueryResponseSchema
>["data"];

export const GraphTraversalResponseSchema = z.object({
  data: z.object({
    startNodeId: z.string().uuid(),
    maxHops: z.number().int(),
    edges: z.array(EdgeSchema),
    nodes: z.array(NodeSchema),
  }),
});

export type GraphTraversalResult = z.infer<
  typeof GraphTraversalResponseSchema
>["data"];

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
