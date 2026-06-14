import { z } from "zod";
import { LifecycleStatusSchema } from "./definitions.js";
import { ContextSpecSchema } from "./workflow-context.js";
import {
  WorkflowTriggerSpecSchema,
  createManualWorkflowTrigger,
} from "./workflow-trigger-event.js";

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

/** Stable snake_case identifier for workflow routing and MCP lookup. */
export const WorkflowKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "workflowKey must be snake_case");

export type WorkflowKey = z.infer<typeof WorkflowKeySchema>;

export const WorkflowEvaluationModeSchema = z.enum([
  "deterministic",
  "agentic",
]);

export type WorkflowEvaluationMode = z.infer<
  typeof WorkflowEvaluationModeSchema
>;

export const WorkflowEnforcementSchema = z.enum(["hard", "soft"]);

export type WorkflowEnforcement = z.infer<typeof WorkflowEnforcementSchema>;

/** Branching rule evaluated against assembled context. */
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
  output: z.string().optional(),
  conditionId: z.string().optional(),
  referenceIds: z.array(z.string()).default([]),
  routeToWorkflowKey: WorkflowKeySchema.optional(),
});

export type WorkflowStepSpec = z.infer<typeof WorkflowStepSpecSchema>;

/** Progressive disclosure — inline text, external URL, or nested workflow. */
export const WorkflowReferenceSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["inline", "url", "workflow"]).default("inline"),
  body: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  workflowKey: WorkflowKeySchema.optional(),
});

export type WorkflowReferenceSpec = z.infer<typeof WorkflowReferenceSpecSchema>;

/** Hand execution to another workflow (progressive disclosure / routing). */
export const WorkflowRouteSpecSchema = z.object({
  id: z.string().min(1),
  targetWorkflowKey: WorkflowKeySchema,
  conditionId: z.string().optional(),
  label: z.string().optional(),
});

export type WorkflowRouteSpec = z.infer<typeof WorkflowRouteSpecSchema>;

/** Expected artifacts and completion semantics. */
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

const WorkflowDefinitionBaseSchema = z.object({
  title: z.string().min(1),
  workflowKey: WorkflowKeySchema.optional(),
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
  conditions: z.array(WorkflowConditionSpecSchema).default([]),
  steps: z.array(WorkflowStepSpecSchema).min(1),
  gates: z.array(WorkflowGateSpecSchema).default([]),
  output: WorkflowOutputSpecSchema.default({ contract: {} }),
  references: z.array(WorkflowReferenceSpecSchema).default([]),
  routes: z.array(WorkflowRouteSpecSchema).default([]),
  /** Freeform agent guidance rendered in the agent package. */
  agentNotes: z.string().nullable().optional(),
  /** Registered node catalog entries with workflow-scoped action toggles. */
  applicableNodeTypes: z.array(WorkflowApplicableNodeTypeSchema).default([]),
  /** Workflow-level allowed actions. */
  allowedActions: z.array(z.string()).default([]),
});

/** Catalog upsert / define payload — at least one step required. */
export const WorkflowDefinitionSchema = WorkflowDefinitionBaseSchema;

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

/** Persisted workflow wire shape (workflows catalog row). */
export const WorkflowSchema = WorkflowDefinitionBaseSchema.extend({
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
  patch: WorkflowDefinitionBaseSchema.partial().extend({
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
