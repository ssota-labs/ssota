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

export const ActionScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global") }),
  z.object({ kind: z.literal("node_type"), nodeType: z.string().min(1) }),
  z.object({ kind: z.literal("edge_type"), edgeType: z.string().min(1) }),
  z.object({
    kind: z.literal("property"),
    nodeType: z.string().min(1),
    propertyKey: z.string().min(1),
  }),
  z.object({
    kind: z.literal("instruction"),
    instructionId: z.string().uuid().optional(),
    title: z.string().min(1).optional(),
  }),
]);

export type ActionScope = z.infer<typeof ActionScopeSchema>;

export const GateStatusSchema = z.enum(["pending", "approved", "rejected"]);

export type GateStatus = z.infer<typeof GateStatusSchema>;

export const LifecycleTransitionsSchema = z.record(
  LifecycleStatusSchema,
  z.array(LifecycleStatusSchema),
);

export type LifecycleTransitions = z.infer<typeof LifecycleTransitionsSchema>;

export const NodeTypeDefinitionSchema = z.object({
  nodeType: z.string().min(1),
  family: NodeFamilySchema,
  archetypeId: z.string().min(1),
  typicalValueOverrides: z.record(z.unknown()).default({}),
  lifecycleTransitions: LifecycleTransitionsSchema,
  contentGuide: z.string().nullable().optional(),
  propertyRefs: z.array(z.string()).optional(),
  allowedActionRefs: z.array(z.string()).optional(),
});

export type NodeTypeDefinition = z.infer<typeof NodeTypeDefinitionSchema>;

export const NodeTypeDefinitionPatchSchema = NodeTypeDefinitionSchema.partial().extend({
  nodeType: z.string().min(1),
});

export type NodeTypeDefinitionPatch = z.infer<typeof NodeTypeDefinitionPatchSchema>;

export const DefineNodeTypeInputSchema = z.object({
  definition: NodeTypeDefinitionSchema,
});

export type DefineNodeTypeInput = z.infer<typeof DefineNodeTypeInputSchema>;

export const UpdateNodeTypeInputSchema = z.object({
  nodeType: z.string().min(1),
  patch: NodeTypeDefinitionPatchSchema.omit({ nodeType: true }),
});

export type UpdateNodeTypeInput = z.infer<typeof UpdateNodeTypeInputSchema>;

export const DeprecateNodeTypeInputSchema = z.object({
  nodeType: z.string().min(1),
  replacementNodeType: z.string().optional(),
});

export type DeprecateNodeTypeInput = z.infer<typeof DeprecateNodeTypeInputSchema>;

export const EdgeTypeDefinitionSchema = z.object({
  edgeType: z.string().min(1),
  domain: z.array(z.string()).min(1),
  range: z.array(z.string()).min(1),
  cardinality: z.string().min(1),
  representation: z.string().min(1),
});

export type EdgeTypeDefinition = z.infer<typeof EdgeTypeDefinitionSchema>;

export const EdgeTypeDefinitionPatchSchema =
  EdgeTypeDefinitionSchema.partial().extend({
    edgeType: z.string().min(1),
  });

export type EdgeTypeDefinitionPatch = z.infer<typeof EdgeTypeDefinitionPatchSchema>;

export const DefineEdgeTypeInputSchema = z.object({
  definition: EdgeTypeDefinitionSchema,
});

export type DefineEdgeTypeInput = z.infer<typeof DefineEdgeTypeInputSchema>;

export const UpdateEdgeTypeInputSchema = z.object({
  edgeType: z.string().min(1),
  patch: EdgeTypeDefinitionPatchSchema.omit({ edgeType: true }),
});

export type UpdateEdgeTypeInput = z.infer<typeof UpdateEdgeTypeInputSchema>;

export const DeprecateEdgeTypeInputSchema = z.object({
  edgeType: z.string().min(1),
});

export type DeprecateEdgeTypeInput = z.infer<typeof DeprecateEdgeTypeInputSchema>;

export const PropertyDefinitionSchema = z.object({
  propertyKey: z.string().min(1),
  valueType: z.string().min(1),
  constraints: z.record(z.unknown()).default({}),
  owningActions: z.array(z.string()).default([]),
});

export type PropertyDefinition = z.infer<typeof PropertyDefinitionSchema>;

export const PropertyDefinitionPatchSchema = PropertyDefinitionSchema.partial().extend(
  {
    propertyKey: z.string().min(1),
  },
);

export type PropertyDefinitionPatch = z.infer<typeof PropertyDefinitionPatchSchema>;

export const DefinePropertyInputSchema = z.object({
  definition: PropertyDefinitionSchema,
});

export type DefinePropertyInput = z.infer<typeof DefinePropertyInputSchema>;

export const UpdatePropertyInputSchema = z.object({
  propertyKey: z.string().min(1),
  patch: PropertyDefinitionPatchSchema.omit({ propertyKey: true }),
});

export type UpdatePropertyInput = z.infer<typeof UpdatePropertyInputSchema>;

export const DeprecatePropertyInputSchema = z.object({
  propertyKey: z.string().min(1),
});

export type DeprecatePropertyInput = z.infer<typeof DeprecatePropertyInputSchema>;

export const PropertyPermissionDefinitionSchema = z.object({
  actionType: z.string().min(1),
  nodeType: z.string().min(1),
  propertyKey: z.string().min(1),
  operation: PermissionOperationSchema,
  permissionType: PermissionTypeSchema,
  valueConstraint: z.record(z.unknown()).nullable().optional(),
  requiresHumanGate: z.boolean().default(false),
  status: z.string().default("active"),
});

export type PropertyPermissionDefinition = z.infer<
  typeof PropertyPermissionDefinitionSchema
>;

export const UpdatePropertyPermissionInputSchema = z.object({
  permission: PropertyPermissionDefinitionSchema,
});

export type UpdatePropertyPermissionInput = z.infer<
  typeof UpdatePropertyPermissionInputSchema
>;

export const ActionContractDefinitionSchema = z.object({
  actionType: z.string().min(1),
  scope: ActionScopeSchema.default({ kind: "global" }),
  preconditions: z.record(z.unknown()).default({}),
  effects: z.array(z.record(z.unknown())).default([]),
  executor: ExecutorTypeSchema,
  allowedLifecycleTransitions: z
    .record(z.array(LifecycleStatusSchema))
    .default({}),
  failureMode: z.string().default("reject"),
  idempotencyRule: z.string().nullable().optional(),
  logPayloadSchema: z.record(z.unknown()).default({}),
});

export type ActionContractDefinition = z.infer<
  typeof ActionContractDefinitionSchema
>;

export const DefineActionContractInputSchema = z.object({
  definition: ActionContractDefinitionSchema,
});

export type DefineActionContractInput = z.infer<
  typeof DefineActionContractInputSchema
>;

export const ActionContractDefinitionPatchSchema =
  ActionContractDefinitionSchema.partial().extend({
    actionType: z.string().min(1),
  });

export type ActionContractDefinitionPatch = z.infer<
  typeof ActionContractDefinitionPatchSchema
>;

export const UpdateActionContractInputSchema = z.object({
  actionType: z.string().min(1),
  patch: ActionContractDefinitionPatchSchema.omit({ actionType: true }),
});

export type UpdateActionContractInput = z.infer<
  typeof UpdateActionContractInputSchema
>;

export const DeprecateActionContractInputSchema = z.object({
  actionType: z.string().min(1),
});

export type DeprecateActionContractInput = z.infer<
  typeof DeprecateActionContractInputSchema
>;

export const InstructionScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global") }),
  z.object({ kind: z.literal("node_type"), nodeType: z.string().min(1) }),
  z.object({ kind: z.literal("edge_type"), edgeType: z.string().min(1) }),
  z.object({
    kind: z.literal("property"),
    nodeType: z.string().min(1),
    propertyKey: z.string().min(1),
  }),
  z.object({ kind: z.literal("action"), actionType: z.string().min(1) }),
]);

export type InstructionScope = z.infer<typeof InstructionScopeSchema>;

export const InstructionWorkflowStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  actionRefs: z.array(z.string()).default([]),
  output: z.string().optional(),
  gate: z.boolean().default(false),
});

export type InstructionWorkflowStep = z.infer<
  typeof InstructionWorkflowStepSchema
>;

export const InstructionDefinitionSchema = z.object({
  title: z.string().min(1),
  triggerPatterns: z.array(z.string()).min(1),
  applicableNodeTypes: z.array(z.string()).default([]),
  requiredActions: z.array(z.string()).default([]),
  optionalActions: z.array(z.string()).default([]),
  lifecycle: LifecycleStatusSchema.default("Active"),
  body: z.string().min(1),
  scope: InstructionScopeSchema.default({ kind: "global" }),
  triggers: z.array(z.string()).default([]),
  workflowSteps: z.array(InstructionWorkflowStepSchema).default([]),
  allowedActions: z.array(z.string()).default([]),
  outputContract: z.record(z.unknown()).default({}),
  gatePolicy: z.record(z.unknown()).default({}),
  completionCriteria: z.string().nullable().optional(),
});

export type InstructionDefinition = z.infer<typeof InstructionDefinitionSchema>;

export const DefineInstructionInputSchema = z.object({
  definition: InstructionDefinitionSchema,
});

export type DefineInstructionInput = z.infer<typeof DefineInstructionInputSchema>;

export const InstructionCatalogUpsertSchema = InstructionDefinitionSchema.extend({
  instructionId: z.string().uuid().optional(),
});

export type InstructionCatalogUpsert = z.infer<
  typeof InstructionCatalogUpsertSchema
>;

export const UpdateInstructionInputSchema = z.object({
  instructionId: z.string().uuid(),
  patch: InstructionDefinitionSchema.partial(),
});

export type UpdateInstructionInput = z.infer<typeof UpdateInstructionInputSchema>;

export const DeprecateInstructionInputSchema = z.object({
  instructionId: z.string().uuid(),
});

export type DeprecateInstructionInput = z.infer<
  typeof DeprecateInstructionInputSchema
>;

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
  z.object({
    kind: z.literal("upsert_node_catalog_entry"),
    entry: NodeTypeDefinitionSchema,
  }),
  z.object({
    kind: z.literal("deprecate_node_catalog_entry"),
    nodeType: z.string().min(1),
    replacementNodeType: z.string().optional(),
  }),
  z.object({
    kind: z.literal("upsert_edge_catalog_entry"),
    entry: EdgeTypeDefinitionSchema,
  }),
  z.object({
    kind: z.literal("deprecate_edge_catalog_entry"),
    edgeType: z.string().min(1),
  }),
  z.object({
    kind: z.literal("upsert_property_catalog_entry"),
    entry: PropertyDefinitionSchema,
  }),
  z.object({
    kind: z.literal("deprecate_property_catalog_entry"),
    propertyKey: z.string().min(1),
  }),
  z.object({
    kind: z.literal("upsert_property_permission_entry"),
    permission: PropertyPermissionDefinitionSchema,
  }),
  z.object({
    kind: z.literal("upsert_action_catalog_entry"),
    entry: ActionContractDefinitionSchema,
  }),
  z.object({
    kind: z.literal("deprecate_action_catalog_entry"),
    actionType: z.string().min(1),
  }),
  z.object({
    kind: z.literal("upsert_instruction_catalog_entry"),
    entry: InstructionCatalogUpsertSchema,
  }),
  z.object({
    kind: z.literal("deprecate_instruction_catalog_entry"),
    instructionId: z.string().uuid(),
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

export const ActionPreviewResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    effects: z.array(EffectSchema),
    wouldGate: z.boolean(),
    gateReason: z.string().optional(),
  }),
  z.object({
    status: z.literal("rejected"),
    code: z.string(),
    reason: z.string(),
  }),
]);

export type ActionPreviewResult = z.infer<typeof ActionPreviewResultSchema>;
