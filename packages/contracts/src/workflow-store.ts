import {
  WorkflowCatalogUpsertSchema,
  WorkflowDefinitionSchema,
  WorkflowSchema,
  deriveApplicableNodeTypes,
  normalizeWorkflowContext,
  normalizeWorkflowTriggerSpec,
  type Workflow,
  type WorkflowCatalogUpsert,
  type WorkflowDefinition,
} from "./workflow.js";

export type WorkflowRow = {
  id: string;
  slug: string;
  workflowKey: string | null;
  lifecycle: Workflow["lifecycle"];
  scope: Workflow["scope"];
  spec: unknown;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeWorkflowSpecInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;
  const applicableNodeTypes = Array.isArray(obj.applicableNodeTypes)
    ? obj.applicableNodeTypes.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];
  const context = normalizeWorkflowContext(obj.context, applicableNodeTypes);
  return {
    ...obj,
    trigger: normalizeWorkflowTriggerSpec(obj.trigger),
    context,
    applicableNodeTypes: deriveApplicableNodeTypes(context),
  };
}

export function parseWorkflowSpec(input: unknown): WorkflowDefinition {
  return WorkflowDefinitionSchema.parse(normalizeWorkflowSpecInput(input));
}

export function materializeWorkflowDefinition(
  definition: WorkflowDefinition,
): WorkflowDefinition {
  return parseWorkflowSpec(definition);
}

export function workflowRowToWire(row: WorkflowRow): Workflow {
  const spec = parseWorkflowSpec(row.spec);
  return WorkflowSchema.parse({
    ...spec,
    id: row.id,
    slug: row.slug,
    workflowKey: row.workflowKey ?? spec.workflowKey,
    lifecycle: row.lifecycle,
    scope: row.scope,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function workflowDefinitionToCatalogUpsert(
  definition: WorkflowDefinition,
  options?: {
    workflowId?: string;
    slug?: string;
  },
): WorkflowCatalogUpsert {
  const materialized = materializeWorkflowDefinition(definition);
  return WorkflowCatalogUpsertSchema.parse({
    workflowId: options?.workflowId,
    slug: options?.slug,
    workflowKey: materialized.workflowKey ?? null,
    lifecycle: materialized.lifecycle,
    scope: materialized.scope,
    spec: materialized,
  });
}

export function mergeWorkflowDefinition(
  existing: WorkflowDefinition,
  patch: Partial<WorkflowDefinition>,
): WorkflowDefinition {
  return parseWorkflowSpec({
    ...existing,
    ...patch,
    trigger: patch.trigger
      ? { ...existing.trigger, ...patch.trigger }
      : existing.trigger,
    context: patch.context
      ? { ...existing.context, ...patch.context }
      : existing.context,
    output: patch.output
      ? { ...existing.output, ...patch.output }
      : existing.output,
    steps: patch.steps ?? existing.steps,
    conditions: patch.conditions ?? existing.conditions,
    gates: patch.gates ?? existing.gates,
    references: patch.references ?? existing.references,
    routes: patch.routes ?? existing.routes,
    allowedActions: patch.allowedActions ?? existing.allowedActions,
    requiredActions: patch.requiredActions ?? existing.requiredActions,
    optionalActions: patch.optionalActions ?? existing.optionalActions,
  });
}
