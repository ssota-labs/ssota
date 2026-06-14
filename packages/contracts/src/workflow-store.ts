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
  type WorkflowNodeBinding,
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

export function normalizeWorkflowNodeBindings(
  definition: Pick<WorkflowDefinition, "nodeBindings" | "applicableNodeTypes">,
): WorkflowNodeBinding[] {
  if (definition.nodeBindings.length > 0) {
    return definition.nodeBindings;
  }
  return definition.applicableNodeTypes.map((nodeType) => ({
    nodeType,
    disabledActions: [],
  }));
}

export function syncApplicableNodeTypesFromBindings(
  nodeBindings: WorkflowNodeBinding[],
): string[] {
  return nodeBindings.map((binding) => binding.nodeType);
}

export function applyWorkflowNodeBindingSync(
  definition: WorkflowDefinition,
): WorkflowDefinition {
  const nodeBindings = normalizeWorkflowNodeBindings(definition);
  return {
    ...definition,
    nodeBindings,
    applicableNodeTypes: syncApplicableNodeTypesFromBindings(nodeBindings),
  };
}

function normalizeWorkflowSpecInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;
  const applicableNodeTypes = Array.isArray(obj.applicableNodeTypes)
    ? obj.applicableNodeTypes.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];
  const hasNodeBindings =
    Array.isArray(obj.nodeBindings) && obj.nodeBindings.length > 0;
  const context = normalizeWorkflowContext(obj.context, applicableNodeTypes);
  const derivedFromContext = deriveApplicableNodeTypes(context);
  const nextApplicableNodeTypes = hasNodeBindings
    ? applicableNodeTypes
    : applicableNodeTypes.length > 0
      ? applicableNodeTypes
      : derivedFromContext;
  return {
    ...obj,
    trigger: normalizeWorkflowTriggerSpec(obj.trigger),
    context,
    applicableNodeTypes: nextApplicableNodeTypes,
  };
}

export function parseWorkflowSpec(input: unknown): WorkflowDefinition {
  const parsed = WorkflowDefinitionSchema.parse(normalizeWorkflowSpecInput(input));
  return applyWorkflowNodeBindingSync(parsed);
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
    nodeBindings: patch.nodeBindings ?? existing.nodeBindings,
    applicableNodeTypes:
      patch.applicableNodeTypes ?? existing.applicableNodeTypes,
    allowedActions: patch.allowedActions ?? existing.allowedActions,
    requiredActions: patch.requiredActions ?? existing.requiredActions,
    optionalActions: patch.optionalActions ?? existing.optionalActions,
  });
}
