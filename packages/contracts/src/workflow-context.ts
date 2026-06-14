import { z } from "zod";
import { LifecycleStatusSchema } from "./definitions.js";

export const ContextFilterOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
]);

export type ContextFilterOperator = z.infer<typeof ContextFilterOperatorSchema>;

export const ContextFilterConditionSchema = z.object({
  id: z.string().min(1),
  propertyKey: z.string().min(1),
  operator: ContextFilterOperatorSchema,
  value: z.string().optional(),
});

export type ContextFilterCondition = z.infer<typeof ContextFilterConditionSchema>;

export const ContextFilterGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  nodeType: z.string().min(1),
  combinator: z.enum(["and", "or"]).default("and"),
  conditions: z.array(ContextFilterConditionSchema).default([]),
  lifecycleStatus: LifecycleStatusSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type ContextFilterGroup = z.infer<typeof ContextFilterGroupSchema>;

/** Graph hop / neighbor retrieval plan (independent of filter groups). */
export const ContextTraversalPlanSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  /** Node type to anchor graph hops. */
  startNodeType: z.string().min(1),
  /** @deprecated Legacy filter-group ref; migrated to startNodeType on read. */
  startNodeRef: z.string().optional(),
  direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
  edgeTypes: z.array(z.string()).optional(),
  nodeTypes: z.array(z.string()).optional(),
  maxHops: z.number().int().positive().max(5).default(2),
  limit: z.number().int().positive().max(100).optional(),
});

export type ContextTraversalPlan = z.infer<typeof ContextTraversalPlanSchema>;

/** @deprecated Legacy assertion kinds; migrated to nodeType + conditions on read. */
export const ContextAssertionKindSchema = z.enum([
  "node_exists",
  "property_present",
  "property_equals",
  "status_equals",
  "count_at_least",
]);

export type ContextAssertionKind = z.infer<typeof ContextAssertionKindSchema>;

/** Soft checks agents evaluate against assembled context nodes of a type. */
export const ContextAssertionSchema = z.object({
  id: z.string().min(1),
  nodeType: z.string().min(1),
  combinator: z.enum(["and", "or"]).default("and"),
  conditions: z.array(ContextFilterConditionSchema).default([]),
  mode: z.enum(["deterministic", "agentic"]).default("agentic"),
  enforcement: z.enum(["hard", "soft"]).default("soft"),
});

export type ContextAssertion = z.infer<typeof ContextAssertionSchema>;

export const ContextSpecSchema = z.object({
  filterGroups: z.array(ContextFilterGroupSchema).default([]),
  traversals: z.array(ContextTraversalPlanSchema).default([]),
  assertions: z.array(ContextAssertionSchema).default([]),
  notes: z.string().optional(),
});

export type ContextSpec = z.infer<typeof ContextSpecSchema>;

function migrateTraversalPlan(
  raw: unknown,
  filterGroups: ContextFilterGroup[],
): ContextTraversalPlan {
  const item =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const filterGroupById = new Map(filterGroups.map((group) => [group.id, group]));

  const startNodeRef =
    typeof item.startNodeRef === "string" && item.startNodeRef.trim()
      ? item.startNodeRef.trim()
      : undefined;
  const explicitStartNodeType =
    typeof item.startNodeType === "string" && item.startNodeType.trim()
      ? item.startNodeType.trim()
      : undefined;
  const legacyStartNodeType = startNodeRef
    ? filterGroupById.get(startNodeRef)?.nodeType
    : undefined;

  return ContextTraversalPlanSchema.parse({
    ...item,
    startNodeType:
      explicitStartNodeType ?? legacyStartNodeType ?? startNodeRef ?? "Node",
    startNodeRef: undefined,
  });
}

function migrateContextTraversals(
  rawTraversals: unknown,
  filterGroups: ContextFilterGroup[],
): ContextTraversalPlan[] {
  if (!Array.isArray(rawTraversals)) return [];
  return rawTraversals.map((traversal) =>
    migrateTraversalPlan(traversal, filterGroups),
  );
}

function migrateLegacyAssertion(
  item: Record<string, unknown>,
  fallbackNodeType: string,
): ContextAssertion {
  const params =
    item.params && typeof item.params === "object"
      ? (item.params as Record<string, unknown>)
      : {};
  const kind = item.kind as ContextAssertionKind | undefined;
  const id =
    typeof item.id === "string" && item.id.trim()
      ? item.id.trim()
      : `as_legacy_${Math.random().toString(36).slice(2, 10)}`;
  const mode = item.mode === "deterministic" ? "deterministic" : "agentic";
  const enforcement = item.enforcement === "hard" ? "hard" : "soft";

  let nodeType =
    typeof params.nodeType === "string" && params.nodeType.trim()
      ? params.nodeType.trim()
      : fallbackNodeType;
  let conditions: ContextFilterCondition[] = [];

  const conditionId = (suffix: string) => `cond_${id}_${suffix}`;

  switch (kind) {
    case "status_equals":
      conditions = [
        {
          id: conditionId("status"),
          propertyKey: "lifecycle_status",
          operator: "equals",
          value:
            typeof params.status === "string" ? params.status : undefined,
        },
      ];
      break;
    case "property_equals":
      conditions = [
        {
          id: conditionId("property"),
          propertyKey:
            typeof params.propertyKey === "string"
              ? params.propertyKey
              : "title",
          operator: "equals",
          value: typeof params.value === "string" ? params.value : undefined,
        },
      ];
      break;
    case "property_present":
      conditions = [
        {
          id: conditionId("present"),
          propertyKey:
            typeof params.propertyKey === "string"
              ? params.propertyKey
              : "title",
          operator: "is_not_empty",
        },
      ];
      break;
    case "node_exists":
    case "count_at_least":
      nodeType =
        typeof params.nodeType === "string" && params.nodeType.trim()
          ? params.nodeType.trim()
          : fallbackNodeType;
      conditions = [];
      break;
    default:
      break;
  }

  return ContextAssertionSchema.parse({
    id,
    nodeType,
    combinator: "and",
    conditions,
    mode,
    enforcement,
  });
}

function migrateAssertionPlan(
  raw: unknown,
  fallbackNodeType: string,
): ContextAssertion {
  const item =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  if (
    typeof item.nodeType === "string" &&
    item.nodeType.trim() &&
    !item.kind
  ) {
    return ContextAssertionSchema.parse(item);
  }

  if (typeof item.kind === "string") {
    return migrateLegacyAssertion(item, fallbackNodeType);
  }

  return ContextAssertionSchema.parse({
    id:
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim()
        : `as_${Math.random().toString(36).slice(2, 10)}`,
    nodeType: fallbackNodeType,
    combinator: "and",
    conditions: [],
    mode: item.mode === "deterministic" ? "deterministic" : "agentic",
    enforcement: item.enforcement === "hard" ? "hard" : "soft",
  });
}

function migrateContextAssertions(
  rawAssertions: unknown,
  fallbackNodeType: string,
): ContextAssertion[] {
  if (!Array.isArray(rawAssertions)) return [];
  return rawAssertions.map((assertion) =>
    migrateAssertionPlan(assertion, fallbackNodeType),
  );
}

function defaultAssertionNodeType(
  filterGroups: ContextFilterGroup[],
  applicableNodeTypes: string[],
): string {
  return (
    filterGroups[0]?.nodeType ??
    applicableNodeTypes[0] ??
    "Node"
  );
}

export function deriveApplicableNodeTypes(context: ContextSpec): string[] {
  const types = context.filterGroups
    .map((group) => group.nodeType.trim())
    .filter(Boolean);
  return [...new Set(types)];
}

function filterGroupsFromApplicableNodeTypes(
  applicableNodeTypes: string[],
): ContextFilterGroup[] {
  return applicableNodeTypes.map((nodeType, index) => ({
    id: `fg_${nodeType.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${index}`,
    nodeType,
    combinator: "and" as const,
    conditions: [],
  }));
}

function filterGroupsFromLegacyQueries(
  queries: unknown[],
): ContextFilterGroup[] {
  return queries.map((item, index) => {
    const query =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
    const nodeType =
      typeof query.nodeType === "string" && query.nodeType.trim()
        ? query.nodeType.trim()
        : "Node";
    return {
      id: String(query.id ?? `legacy_query_${index}`),
      label: typeof query.label === "string" ? query.label : undefined,
      nodeType,
      combinator: "and" as const,
      conditions: [],
      lifecycleStatus:
        typeof query.lifecycleStatus === "string"
          ? (query.lifecycleStatus as ContextFilterGroup["lifecycleStatus"])
          : undefined,
      limit:
        typeof query.limit === "number" ? query.limit : undefined,
    };
  });
}

/** Normalize persisted or legacy context shapes (queries[], applicableNodeTypes-only). */
export function normalizeWorkflowContext(
  raw: unknown,
  applicableNodeTypes: string[] = [],
): ContextSpec {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;

  if (obj && Array.isArray(obj.filterGroups)) {
    const filterGroups = ContextSpecSchema.shape.filterGroups.parse(
      obj.filterGroups,
    );
    const assertionFallback = defaultAssertionNodeType(
      filterGroups,
      applicableNodeTypes,
    );
    return ContextSpecSchema.parse({
      filterGroups,
      traversals: migrateContextTraversals(obj.traversals, filterGroups),
      assertions: migrateContextAssertions(obj.assertions, assertionFallback),
      notes: typeof obj.notes === "string" ? obj.notes : undefined,
    });
  }

  if (obj && Array.isArray(obj.queries) && obj.queries.length > 0) {
    const filterGroups = filterGroupsFromLegacyQueries(obj.queries);
    const assertionFallback = defaultAssertionNodeType(
      filterGroups,
      applicableNodeTypes,
    );
    return ContextSpecSchema.parse({
      filterGroups,
      traversals: migrateContextTraversals(obj.traversals, filterGroups),
      assertions: migrateContextAssertions(obj.assertions, assertionFallback),
      notes: typeof obj.notes === "string" ? obj.notes : undefined,
    });
  }

  if (applicableNodeTypes.length > 0) {
    const filterGroups = filterGroupsFromApplicableNodeTypes(applicableNodeTypes);
    const assertionFallback = defaultAssertionNodeType(
      filterGroups,
      applicableNodeTypes,
    );
    return ContextSpecSchema.parse({
      filterGroups,
      traversals: migrateContextTraversals(obj?.traversals, filterGroups),
      assertions: migrateContextAssertions(
        obj?.assertions,
        assertionFallback,
      ),
      notes: typeof obj?.notes === "string" ? obj.notes : undefined,
    });
  }

  return ContextSpecSchema.parse({
    filterGroups: [],
    traversals: migrateContextTraversals(obj?.traversals, []),
    assertions: migrateContextAssertions(
      obj?.assertions,
      defaultAssertionNodeType([], applicableNodeTypes),
    ),
    notes: typeof obj?.notes === "string" ? obj.notes : undefined,
  });
}
