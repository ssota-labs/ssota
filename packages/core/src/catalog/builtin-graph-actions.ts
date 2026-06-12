import type { Effect, ExecutorType } from "@ssota/contracts";
import type { ActionCatalogEntry } from "../domain/types.js";
import { toCatalogLabel, toCatalogSlug } from "../catalog-slug.js";
import { DEFAULT_LIFECYCLE_TRANSITIONS } from "./builtin-meta-actions.js";

type BuiltinGraphActionRow = {
  actionType: string;
  preconditions: Record<string, unknown>;
  effects: Record<string, unknown>[];
  executor: ExecutorType;
  allowedLifecycleTransitions: Record<string, string[]>;
  failureMode: string;
  idempotencyRule: string | null;
  logPayloadSchema: Record<string, unknown>;
};

const BUILTIN_GRAPH_ACTION_ROWS: BuiltinGraphActionRow[] = [
  {
    actionType: "create_node",
    preconditions: { requiredFields: ["nodeType"] },
    effects: [
      {
        kind: "create_node",
        node: {
          nodeType: "",
          lifecycleStatus: "Draft",
          properties: {},
          content: null,
          provenance: {},
        },
      },
    ],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  },
  {
    actionType: "update_node_properties",
    preconditions: {
      requiredFields: ["nodeId", "properties"],
      requiresExistingNode: true,
    },
    effects: [
      {
        kind: "update_node",
        nodeId: "",
        patch: { properties: {} },
      },
    ],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  },
  {
    actionType: "update_node_property_schema",
    preconditions: { requiredFields: ["nodeType", "patch"] },
    effects: [
      {
        kind: "upsert_node_catalog_entry",
        entry: {
          nodeType: "",
          family: "document",
          archetypeId: "",
          typicalValueOverrides: {},
          lifecycleTransitions: { ...DEFAULT_LIFECYCLE_TRANSITIONS },
          contentGuide: null,
          propertySchema: {},
        },
      },
    ],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  },
];

function toBuiltinEntry(row: BuiltinGraphActionRow): ActionCatalogEntry {
  return {
    actionType: row.actionType,
    slug: toCatalogSlug(row.actionType),
    label: toCatalogLabel(row.actionType),
    scope: { kind: "global" },
    preconditions: row.preconditions,
    effects: row.effects as Effect[],
    executor: row.executor,
    allowedLifecycleTransitions:
      row.allowedLifecycleTransitions as ActionCatalogEntry["allowedLifecycleTransitions"],
    failureMode: row.failureMode,
    idempotencyRule: row.idempotencyRule,
    logPayloadSchema: row.logPayloadSchema,
    catalogSource: "builtin",
  };
}

const graphBuiltinByActionType = new Map(
  BUILTIN_GRAPH_ACTION_ROWS.map((row) => [row.actionType, toBuiltinEntry(row)]),
);

const graphBuiltinBySlug = new Map(
  [...graphBuiltinByActionType.values()].map((entry) => [entry.slug, entry]),
);

export const BUILTIN_GRAPH_ACTION_TYPES: ReadonlySet<string> = new Set(
  BUILTIN_GRAPH_ACTION_ROWS.map((row) => row.actionType),
);

export function isBuiltinGraphActionType(actionType: string): boolean {
  return BUILTIN_GRAPH_ACTION_TYPES.has(actionType);
}

export function getBuiltinGraphActionCatalogEntry(
  actionType: string,
): ActionCatalogEntry | null {
  return graphBuiltinByActionType.get(actionType) ?? null;
}

export function getBuiltinGraphActionCatalogEntryBySlug(
  slug: string,
): ActionCatalogEntry | null {
  return graphBuiltinBySlug.get(slug) ?? null;
}

export function listBuiltinGraphActionCatalogEntries(): ActionCatalogEntry[] {
  return [...graphBuiltinByActionType.values()];
}
