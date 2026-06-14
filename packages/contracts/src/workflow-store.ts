import {
  WorkflowCatalogUpsertSchema,
  WorkflowDefinitionSchema,
  WorkflowSchema,
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

export function parseWorkflowSpec(input: unknown): WorkflowDefinition {
  const normalized =
    input && typeof input === "object"
      ? {
          ...(input as Record<string, unknown>),
          trigger: normalizeWorkflowTriggerSpec(
            (input as Record<string, unknown>).trigger,
          ),
        }
      : input;
  const parsed = WorkflowDefinitionSchema.parse(normalized);
  return applyWorkflowNodeBindingSync(parsed);
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
  const synced = applyWorkflowNodeBindingSync(definition);
  return WorkflowCatalogUpsertSchema.parse({
    workflowId: options?.workflowId,
    slug: options?.slug,
    workflowKey: synced.workflowKey ?? null,
    lifecycle: synced.lifecycle,
    scope: synced.scope,
    spec: synced,
  });
}

export function mergeWorkflowDefinition(
  existing: WorkflowDefinition,
  patch: Partial<WorkflowDefinition>,
): WorkflowDefinition {
  const merged = WorkflowDefinitionSchema.parse({
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
  return applyWorkflowNodeBindingSync(merged);
}
