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

/** Graph hop / neighbor retrieval plan. */
export const ContextTraversalPlanSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
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

export const ContextAssertionSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  mode: z.enum(["deterministic", "agentic"]).default("agentic"),
  enforcement: z.enum(["hard", "soft"]).default("soft"),
  kind: ContextAssertionKindSchema,
  params: z.record(z.unknown()).default({}),
});

export type ContextAssertion = z.infer<typeof ContextAssertionSchema>;

export const ContextSpecSchema = z.object({
  filterGroups: z.array(ContextFilterGroupSchema).default([]),
  traversals: z.array(ContextTraversalPlanSchema).default([]),
  assertions: z.array(ContextAssertionSchema).default([]),
  notes: z.string().optional(),
});

export type ContextSpec = z.infer<typeof ContextSpecSchema>;

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
    return ContextSpecSchema.parse({
      filterGroups: obj.filterGroups,
      traversals: obj.traversals ?? [],
      assertions: obj.assertions ?? [],
      notes: typeof obj.notes === "string" ? obj.notes : undefined,
    });
  }

  if (obj && Array.isArray(obj.queries) && obj.queries.length > 0) {
    return ContextSpecSchema.parse({
      filterGroups: filterGroupsFromLegacyQueries(obj.queries),
      traversals: obj.traversals ?? [],
      assertions: obj.assertions ?? [],
      notes: typeof obj.notes === "string" ? obj.notes : undefined,
    });
  }

  if (applicableNodeTypes.length > 0) {
    return ContextSpecSchema.parse({
      filterGroups: filterGroupsFromApplicableNodeTypes(applicableNodeTypes),
      traversals: obj?.traversals ?? [],
      assertions: obj?.assertions ?? [],
      notes: typeof obj?.notes === "string" ? obj.notes : undefined,
    });
  }

  return ContextSpecSchema.parse({
    filterGroups: [],
    traversals: obj?.traversals ?? [],
    assertions: obj?.assertions ?? [],
    notes: typeof obj?.notes === "string" ? obj.notes : undefined,
  });
}
