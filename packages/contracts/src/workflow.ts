import { z } from "zod";
import { LifecycleStatusSchema } from "./definitions.js";

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

/** When and why a workflow may start. */
export const WorkflowTriggerSpecSchema = z.object({
  /** Intent patterns matched by find_workflow / agent routing. */
  patterns: z.array(z.string()).default([]),
  /** Event or automation hook identifiers. */
  events: z.array(z.string()).default([]),
});

export type WorkflowTriggerSpec = z.infer<typeof WorkflowTriggerSpecSchema>;

/** Node query plan agents execute before acting. */
export const ContextQueryPlanSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  nodeType: z.string().optional(),
  lifecycleStatus: LifecycleStatusSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type ContextQueryPlan = z.infer<typeof ContextQueryPlanSchema>;

/** Graph hop / neighbor retrieval plan. */
export const ContextTraversalPlanSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  /** Reference to a query result id or runtime parameter name. */
  startNodeRef: z.string().min(1),
  direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
  edgeTypes: z.array(z.string()).optional(),
  nodeTypes: z.array(z.string()).optional(),
  maxHops: z.number().int().positive().max(5).default(2),
  limit: z.number().int().positive().max(100).optional(),
});

export type ContextTraversalPlan = z.infer<typeof ContextTraversalPlanSchema>;

export const ContextAssertionKindSchema = z.enum([
  "node_exists",
  "property_present",
  "property_equals",
  "status_equals",
  "count_at_least",
]);

export type ContextAssertionKind = z.infer<typeof ContextAssertionKindSchema>;

/** Precondition on retrieved context — engine or agent evaluated. */
export const ContextAssertionSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  mode: z.enum(["deterministic", "agentic"]).default("deterministic"),
  enforcement: z.enum(["hard", "soft"]).default("soft"),
  kind: ContextAssertionKindSchema,
  params: z.record(z.unknown()).default({}),
});

export type ContextAssertion = z.infer<typeof ContextAssertionSchema>;

/**
 * Structured retrieval plan — SSOT for context assembly.
 * Agent-readable text is rendered from this spec, not the other way around.
 */
export const ContextSpecSchema = z.object({
  queries: z.array(ContextQueryPlanSchema).default([]),
  traversals: z.array(ContextTraversalPlanSchema).default([]),
  assertions: z.array(ContextAssertionSchema).default([]),
  notes: z.string().optional(),
});

export type ContextSpec = z.infer<typeof ContextSpecSchema>;

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

const WorkflowDefinitionBaseSchema = z.object({
  title: z.string().min(1),
  workflowKey: WorkflowKeySchema.optional(),
  lifecycle: LifecycleStatusSchema.default("Active"),
  scope: WorkflowScopeSchema.default({ kind: "global" }),
  trigger: WorkflowTriggerSpecSchema,
  context: ContextSpecSchema.default({
    queries: [],
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
  /** Node types this workflow commonly applies to. */
  applicableNodeTypes: z.array(z.string()).default([]),
  /** Workflow-level allowed actions. */
  allowedActions: z.array(z.string()).default([]),
  requiredActions: z.array(z.string()).default([]),
  optionalActions: z.array(z.string()).default([]),
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
