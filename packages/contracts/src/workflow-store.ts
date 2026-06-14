import {
  WorkflowCatalogUpsertSchema,
  WorkflowDefinitionSchema,
  WorkflowSchema,
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
  return WorkflowDefinitionSchema.parse(normalized);
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
  return WorkflowCatalogUpsertSchema.parse({
    workflowId: options?.workflowId,
    slug: options?.slug,
    workflowKey: definition.workflowKey ?? null,
    lifecycle: definition.lifecycle,
    scope: definition.scope,
    spec: definition,
  });
}

export function mergeWorkflowDefinition(
  existing: WorkflowDefinition,
  patch: Partial<WorkflowDefinition>,
): WorkflowDefinition {
  return WorkflowDefinitionSchema.parse({
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
    applicableNodeTypes:
      patch.applicableNodeTypes ?? existing.applicableNodeTypes,
    allowedActions: patch.allowedActions ?? existing.allowedActions,
    requiredActions: patch.requiredActions ?? existing.requiredActions,
    optionalActions: patch.optionalActions ?? existing.optionalActions,
  });
}
