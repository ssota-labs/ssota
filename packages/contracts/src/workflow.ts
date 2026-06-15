import { z } from "zod";
import { LifecycleStatusSchema } from "./definitions.js";
import { ContextSpecSchema } from "./workflow-context.js";
import {
  RouteBlockSchema,
  WorkflowBlockRefSchema,
  WorkflowExternalLinkSourceSchema,
  WorkflowFlowEntrySchema,
  WorkflowKeySchema,
} from "./workflow-graph.js";
import {
  WorkflowTriggerSpecSchema,
  createManualWorkflowTrigger,
} from "./workflow-trigger-event.js";

export {
  RouteBlockSchema,
  RouteOutletSchema,
  RouteOutletTargetSchema,
  WorkflowBlockRefSchema,
  WorkflowExternalLinkSchema,
  WorkflowExternalLinkSourceSchema,
  WorkflowFlowEntrySchema,
  WorkflowKeySchema,
  type RouteBlock,
  type RouteOutlet,
  type RouteOutletTarget,
  type WorkflowBlockRef,
  type WorkflowExternalLink,
  type WorkflowExternalLinkSource,
  type WorkflowFlowEntry,
  type WorkflowKey,
} from "./workflow-graph.js";

export { migrateWorkflowGraph, resolveOutletTargetNodeId } from "./workflow-graph-migrate.js";

export {
  ContextAssertionKindSchema,
  ContextAssertionSchema,
  ContextFilterConditionSchema,
  ContextFilterGroupSchema,
  ContextFilterOperatorSchema,
  ContextSpecSchema,
  ContextTraversalPlanSchema,
  deriveApplicableNodeTypes,
  normalizeWorkflowContext,
  type ContextAssertion,
  type ContextAssertionKind,
  type ContextFilterCondition,
  type ContextFilterGroup,
  type ContextFilterOperator,
  type ContextSpec,
  type ContextTraversalPlan,
} from "./workflow-context.js";

export {
  WorkflowTriggerEventSchema,
  WorkflowTriggerSpecSchema,
  createManualWorkflowTrigger,
  normalizeWorkflowTriggerEvents,
  normalizeWorkflowTriggerSpec,
  type WorkflowTriggerEvent,
  type WorkflowTriggerSpec,
} from "./workflow-trigger-event.js";

export const WorkflowScopeSchema = z.discriminatedUnion("kind", [
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

export type WorkflowScope = z.infer<typeof WorkflowScopeSchema>;

export const WorkflowEvaluationModeSchema = z.enum([
  "deterministic",
  "agentic",
]);

export type WorkflowEvaluationMode = z.infer<
  typeof WorkflowEvaluationModeSchema
>;

export const WorkflowEnforcementSchema = z.enum(["hard", "soft"]);

export type WorkflowEnforcement = z.infer<typeof WorkflowEnforcementSchema>;

/**
 * @deprecated Use RouteBlock outlets — agentic routing lives in routingInstructionUrl.
 */
export const WorkflowConditionSpecSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  mode: WorkflowEvaluationModeSchema.default("agentic"),
  enforcement: WorkflowEnforcementSchema.default("soft"),
  /** Deterministic expression DSL — reserved for runtime engine v1+. */
  expression: z.string().optional(),
  /** Agent-readable criteria when mode=agentic. */
  description: z.string().optional(),
});

export type WorkflowConditionSpec = z.infer<typeof WorkflowConditionSpecSchema>;

/** Atomic write contract reference inside a step. */
export const WorkflowStepActionRefSchema = z.object({
  actionType: z.string().min(1),
  required: z.boolean().default(false),
});

export type WorkflowStepActionRef = z.infer<
  typeof WorkflowStepActionRefSchema
>;

/** Human approval checkpoint. */
export const WorkflowGateSpecSchema = z.object({
  id: z.string().min(1),
  policy: z.record(z.unknown()).default({}),
  required: z.boolean().default(true),
  reason: z.string().optional(),
});

export type WorkflowGateSpec = z.infer<typeof WorkflowGateSpecSchema>;

/**
 * Semantic work unit inside a workflow graph.
 */
export const WorkflowStepSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  mode: WorkflowEvaluationModeSchema.default("agentic"),
  actions: z.array(WorkflowStepActionRefSchema).default([]),
  gate: WorkflowGateSpecSchema.nullable().optional(),
  /** Notion runbook URL for how to execute this step. */
  instructionUrl: z.string().url().nullable().optional(),
  /** Next step in a linear chain (e.g. after a route outlet). */
  nextStepId: z.string().optional(),
  /** @deprecated Use instructionUrl */
  output: z.string().optional(),
  /** @deprecated Removed — use RouteBlock */
  conditionId: z.string().optional(),
  /** @deprecated Use instructionUrl */
  referenceIds: z.array(z.string()).default([]),
  /** @deprecated Use RouteBlock outlet → WorkflowBlockRef */
  routeToWorkflowKey: WorkflowKeySchema.optional(),
});

export type WorkflowStepSpec = z.infer<typeof WorkflowStepSpecSchema>;

/**
 * @deprecated Use WorkflowExternalLink on Route/Step.
 */
/**
 * @deprecated Use WorkflowExternalLinkSourceSchema.
 */
export const WorkflowReferenceSourceSchema = WorkflowExternalLinkSourceSchema;

export type WorkflowReferenceSource = z.infer<
  typeof WorkflowReferenceSourceSchema
>;

/** @deprecated Use WorkflowExternalLink + instructionUrl */
export const WorkflowReferenceSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["inline", "url", "workflow"]).default("inline"),
  body: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  workflowKey: WorkflowKeySchema.optional(),
  /** Hint for which MCP/integration to use when fetching url references. */
  source: WorkflowReferenceSourceSchema.optional(),
});

export type WorkflowReferenceSpec = z.infer<typeof WorkflowReferenceSpecSchema>;

/** @deprecated Use RouteBlock + WorkflowBlockRef */
export const WorkflowRouteSpecSchema = z.object({
  id: z.string().min(1),
  targetWorkflowKey: WorkflowKeySchema,
  conditionId: z.string().optional(),
  label: z.string().optional(),
});

export type WorkflowRouteSpec = z.infer<typeof WorkflowRouteSpecSchema>;

/**
 * @deprecated Completion lives on Task.acceptanceCriteria and Notion runbooks.
 */
export const WorkflowOutputSpecSchema = z.object({
  contract: z.record(z.unknown()).default({}),
  completionCriteria: z.string().nullable().optional(),
  format: z.string().optional(),
});

export type WorkflowOutputSpec = z.infer<typeof WorkflowOutputSpecSchema>;

/** Workflow-scoped node catalog entry with per-action opt-out. */
export const WorkflowApplicableNodeTypeSchema = z.object({
  nodeType: z.string().min(1),
  /** Opt-out: empty means all associated actions are enabled for this workflow. */
  disabledActions: z.array(z.string()).default([]),
});

export type WorkflowApplicableNodeType = z.infer<
  typeof WorkflowApplicableNodeTypeSchema
>;

/** @deprecated Use WorkflowApplicableNodeTypeSchema */
export const WorkflowNodeBindingSchema = WorkflowApplicableNodeTypeSchema;

/** @deprecated Use WorkflowApplicableNodeType */
export type WorkflowNodeBinding = WorkflowApplicableNodeType;

/** Field-level workflow definition shape (no graph refine). */
export const WorkflowDefinitionFieldsSchema = z.object({
  title: z.string().min(1),
  workflowKey: WorkflowKeySchema.optional(),
  /** Optional UI/metadata tag — does not change runtime behavior. */
  workflowRole: z.string().optional(),
  lifecycle: LifecycleStatusSchema.default("Active"),
  scope: WorkflowScopeSchema.default({ kind: "global" }),
  trigger: WorkflowTriggerSpecSchema.default({
    events: [createManualWorkflowTrigger()],
  }),
  context: ContextSpecSchema.default({
    filterGroups: [],
    traversals: [],
    assertions: [],
  }),
  /** Node after Context on the main spine. */
  flowEntry: WorkflowFlowEntrySchema.optional(),
  routeBlocks: z.array(RouteBlockSchema).default([]),
  workflowBlocks: z.array(WorkflowBlockRefSchema).default([]),
  steps: z.array(WorkflowStepSpecSchema).default([]),
  gates: z.array(WorkflowGateSpecSchema).default([]),
  /** Freeform agent guidance rendered in the agent package. */
  agentNotes: z.string().nullable().optional(),
  /** @deprecated Migrated to routeBlocks on parse */
  conditions: z.array(WorkflowConditionSpecSchema).default([]),
  /** @deprecated Migrated to routeBlocks + workflowBlocks on parse */
  routes: z.array(WorkflowRouteSpecSchema).default([]),
  /** @deprecated Migrated to instructionUrl / Route links on parse */
  references: z.array(WorkflowReferenceSpecSchema).default([]),
  /** @deprecated Migrated to agentNotes on parse */
  output: WorkflowOutputSpecSchema.default({ contract: {} }),
  /** Registered node catalog entries with workflow-scoped action toggles. */
  applicableNodeTypes: z.array(WorkflowApplicableNodeTypeSchema).default([]),
  /** Workflow-level allowed actions. */
  allowedActions: z.array(z.string()).default([]),
});

const workflowGraphRefine = (
  value: z.infer<typeof WorkflowDefinitionFieldsSchema>,
) => value.steps.length > 0 || value.routeBlocks.length > 0;

/** Catalog upsert / define payload. */
export const WorkflowDefinitionSchema = WorkflowDefinitionFieldsSchema.refine(
  workflowGraphRefine,
  {
    message: "Workflow must have at least one step or route block",
  },
);

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

/** Persisted workflow wire shape (workflows catalog row). */
export const WorkflowSchema = WorkflowDefinitionFieldsSchema.extend({
  id: z.string().uuid(),
  slug: z.string().min(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

export const WorkflowCatalogUpsertSchema = z.object({
  workflowId: z.string().uuid().optional(),
  slug: z.string().min(1).optional(),
  workflowKey: WorkflowKeySchema.nullable().optional(),
  lifecycle: LifecycleStatusSchema,
  scope: WorkflowScopeSchema,
  spec: WorkflowDefinitionSchema,
});

export type WorkflowCatalogUpsert = z.infer<typeof WorkflowCatalogUpsertSchema>;

export const DefineWorkflowInputSchema = z.object({
  definition: WorkflowDefinitionSchema,
});

export type DefineWorkflowInput = z.infer<typeof DefineWorkflowInputSchema>;

export const UpdateWorkflowInputSchema = z.object({
  workflowId: z.string().uuid(),
  patch: WorkflowDefinitionFieldsSchema.partial().extend({
    lifecycle: LifecycleStatusSchema.optional(),
    scope: WorkflowScopeSchema.optional(),
  }),
});

export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowInputSchema>;

export const DeprecateWorkflowInputSchema = z.object({
  workflowId: z.string().uuid(),
});

export type DeprecateWorkflowInput = z.infer<typeof DeprecateWorkflowInputSchema>;

export const FindWorkflowInputSchema = z.object({
  query: z.string().min(1),
  nodeType: z.string().optional(),
  limit: z.number().int().positive().max(20).default(5),
});

export type FindWorkflowInput = z.infer<typeof FindWorkflowInputSchema>;

export const GetWorkflowInputSchema = z
  .object({
    workflowId: z.string().uuid().optional(),
    workflowKey: WorkflowKeySchema.optional(),
  })
  .refine((value) => value.workflowId || value.workflowKey, {
    message: "workflowId or workflowKey is required",
  });

export type GetWorkflowInput = z.infer<typeof GetWorkflowInputSchema>;
