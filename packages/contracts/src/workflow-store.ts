import {
  WorkflowApplicableNodeTypeSchema,
  WorkflowCatalogUpsertSchema,
  WorkflowDefinitionSchema,
  WorkflowSchema,
  deriveApplicableNodeTypes,
  migrateWorkflowGraph,
  normalizeWorkflowContext,
  normalizeWorkflowTriggerSpec,
  type Workflow,
  type WorkflowApplicableNodeType,
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

export function listApplicableNodeTypeNames(
  applicableNodeTypes: WorkflowApplicableNodeType[],
): string[] {
  return applicableNodeTypes.map((entry) => entry.nodeType);
}

function parseApplicableNodeTypeEntry(
  value: unknown,
): WorkflowApplicableNodeType | null {
  try {
    return WorkflowApplicableNodeTypeSchema.parse(value);
  } catch {
    return null;
  }
}

/** Migrate legacy spec shapes (string[] applicableNodeTypes, nodeBindings). */
export function migrateApplicableNodeTypes(
  raw: unknown,
): WorkflowApplicableNodeType[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.nodeBindings) && obj.nodeBindings.length > 0) {
    return obj.nodeBindings
      .map(parseApplicableNodeTypeEntry)
      .filter((entry): entry is WorkflowApplicableNodeType => entry !== null);
  }

  if (!Array.isArray(obj.applicableNodeTypes) || obj.applicableNodeTypes.length === 0) {
    return [];
  }

  const first = obj.applicableNodeTypes[0];
  if (typeof first === "string") {
    return obj.applicableNodeTypes
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((nodeType) => ({
        nodeType,
        disabledActions: [] as string[],
      }));
  }

  return obj.applicableNodeTypes
    .map(parseApplicableNodeTypeEntry)
    .filter((entry): entry is WorkflowApplicableNodeType => entry !== null);
}

export function normalizeWorkflowDefinition(
  definition: WorkflowDefinition,
): WorkflowDefinition {
  return {
    ...definition,
    applicableNodeTypes: definition.applicableNodeTypes,
  };
}

function normalizeWorkflowSpecInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;
  const applicableNodeTypes = migrateApplicableNodeTypes(obj);
  const nodeTypeNames = listApplicableNodeTypeNames(applicableNodeTypes);
  const context = normalizeWorkflowContext(obj.context, nodeTypeNames);
  const derivedFromContext = deriveApplicableNodeTypes(context);
  const nextApplicableNodeTypes =
    applicableNodeTypes.length > 0
      ? applicableNodeTypes
      : derivedFromContext.map((nodeType) => ({
          nodeType,
          disabledActions: [] as string[],
        }));

  const {
    nodeBindings: _nodeBindings,
    requiredActions: _requiredActions,
    optionalActions: _optionalActions,
    ...rest
  } = obj;

  return {
    ...rest,
    trigger: normalizeWorkflowTriggerSpec(obj.trigger),
    context,
    applicableNodeTypes: nextApplicableNodeTypes,
  };
}

export function parseWorkflowSpec(input: unknown): WorkflowDefinition {
  const parsed = WorkflowDefinitionSchema.parse(normalizeWorkflowSpecInput(input));
  return normalizeWorkflowDefinition(migrateWorkflowGraph(parsed));
}

/** @deprecated Use normalizeWorkflowDefinition */
export function applyWorkflowNodeBindingSync(
  definition: WorkflowDefinition,
): WorkflowDefinition {
  return normalizeWorkflowDefinition(definition);
}

/** @deprecated Use migrateApplicableNodeTypes */
export function normalizeWorkflowNodeBindings(
  definition: Pick<WorkflowDefinition, "applicableNodeTypes">,
): WorkflowApplicableNodeType[] {
  return definition.applicableNodeTypes;
}

/** @deprecated Use listApplicableNodeTypeNames */
export function syncApplicableNodeTypesFromBindings(
  applicableNodeTypes: WorkflowApplicableNodeType[],
): string[] {
  return listApplicableNodeTypeNames(applicableNodeTypes);
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
    routeBlocks: patch.routeBlocks ?? existing.routeBlocks,
    workflowBlocks: patch.workflowBlocks ?? existing.workflowBlocks,
    flowEntry: patch.flowEntry ?? existing.flowEntry,
    workflowRole: patch.workflowRole ?? existing.workflowRole,
    conditions: patch.conditions ?? existing.conditions,
    gates: patch.gates ?? existing.gates,
    references: patch.references ?? existing.references,
    routes: patch.routes ?? existing.routes,
    applicableNodeTypes:
      patch.applicableNodeTypes ?? existing.applicableNodeTypes,
    allowedActions: patch.allowedActions ?? existing.allowedActions,
  });
}
