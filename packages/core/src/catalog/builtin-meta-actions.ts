import type { Effect, ExecutorType } from "@ssota/contracts";
import type { ActionCatalogEntry } from "../domain/types.js";
import { toCatalogLabel, toCatalogSlug } from "../catalog-slug.js";

export const DEFAULT_LIFECYCLE_TRANSITIONS = {
  Draft: ["Active", "Archived"],
  Active: ["Archived", "Draft"],
  Archived: ["Active"],
  Deleted: [],
};

type BuiltinMetaActionRow = {
  actionType: string;
  preconditions: Record<string, unknown>;
  effects: Record<string, unknown>[];
  executor: ExecutorType;
  allowedLifecycleTransitions: Record<string, string[]>;
  failureMode: string;
  idempotencyRule: string | null;
  logPayloadSchema: Record<string, unknown>;
};

const BUILTIN_META_ACTION_ROWS: BuiltinMetaActionRow[] = [
  {
    actionType: "approve_gate",
    preconditions: { requiredFields: ["gateId", "status"] },
    effects: [{ kind: "update_gate", gateId: "", status: "approved" }],
    executor: "Human",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  },
  {
    actionType: "define_node_type",
    preconditions: { requiredFields: ["definition"] },
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
    actionType: "update_node_type",
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
    actionType: "deprecate_node_type",
    preconditions: { requiredFields: ["nodeType"] },
    effects: [{ kind: "deprecate_node_catalog_entry", nodeType: "" }],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  },
  {
    actionType: "define_edge_type",
    preconditions: { requiredFields: ["definition"] },
    effects: [
      {
        kind: "upsert_edge_catalog_entry",
        entry: {
          edgeType: "",
          domain: [],
          range: [],
          cardinality: "",
          representation: "",
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
    actionType: "define_action_contract",
    preconditions: { requiredFields: ["definition"] },
    effects: [
      {
        kind: "upsert_action_catalog_entry",
        entry: {
          actionType: "",
          scope: { kind: "global" },
          preconditions: {},
          effects: [],
          executor: "Agent",
          allowedLifecycleTransitions: {},
          failureMode: "reject",
          idempotencyRule: null,
          logPayloadSchema: {},
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
    actionType: "define_instruction",
    preconditions: { requiredFields: ["definition"] },
    effects: [
      {
        kind: "upsert_instruction_catalog_entry",
        entry: {
          title: "",
          triggerPatterns: [],
          applicableNodeTypes: [],
          requiredActions: [],
          optionalActions: [],
          lifecycle: "Active",
          body: "",
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
    actionType: "update_edge_type",
    preconditions: { requiredFields: ["edgeType", "patch"] },
    effects: [
      {
        kind: "upsert_edge_catalog_entry",
        entry: {
          edgeType: "",
          domain: [],
          range: [],
          cardinality: "",
          representation: "",
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
    actionType: "deprecate_edge_type",
    preconditions: { requiredFields: ["edgeType"] },
    effects: [{ kind: "deprecate_edge_catalog_entry", edgeType: "" }],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  },
  {
    actionType: "update_property_permission",
    preconditions: { requiredFields: ["permission"] },
    effects: [
      {
        kind: "upsert_property_permission_entry",
        permission: {
          actionType: "",
          nodeType: "",
          propertyKey: "",
          operation: "write",
          permissionType: "allow",
          requiresHumanGate: false,
          status: "active",
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
    actionType: "update_action_contract",
    preconditions: { requiredFields: ["actionType", "patch"] },
    effects: [
      {
        kind: "upsert_action_catalog_entry",
        entry: {
          actionType: "",
          scope: { kind: "global" },
          preconditions: {},
          effects: [],
          executor: "Agent",
          allowedLifecycleTransitions: {},
          failureMode: "reject",
          idempotencyRule: null,
          logPayloadSchema: {},
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
    actionType: "deprecate_action_contract",
    preconditions: { requiredFields: ["actionType"] },
    effects: [{ kind: "deprecate_action_catalog_entry", actionType: "" }],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  },
  {
    actionType: "update_instruction",
    preconditions: { requiredFields: ["instructionId", "patch"] },
    effects: [
      {
        kind: "upsert_instruction_catalog_entry",
        entry: {
          instructionId: "",
          title: "",
          triggerPatterns: [],
          applicableNodeTypes: [],
          requiredActions: [],
          optionalActions: [],
          lifecycle: "Active",
          body: "",
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
    actionType: "deprecate_instruction",
    preconditions: { requiredFields: ["instructionId"] },
    effects: [{ kind: "deprecate_instruction_catalog_entry", instructionId: "" }],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  },
];

function toBuiltinEntry(row: BuiltinMetaActionRow): ActionCatalogEntry {
  return {
    actionType: row.actionType,
    slug: toCatalogSlug(row.actionType),
    label: toCatalogLabel(row.actionType),
    scope: { kind: "global" },
    preconditions: row.preconditions,
    effects: row.effects as Effect[],
    executor: row.executor,
    allowedLifecycleTransitions: row.allowedLifecycleTransitions as ActionCatalogEntry["allowedLifecycleTransitions"],
    failureMode: row.failureMode,
    idempotencyRule: row.idempotencyRule,
    logPayloadSchema: row.logPayloadSchema,
    catalogSource: "builtin",
  };
}

const builtinByActionType = new Map(
  BUILTIN_META_ACTION_ROWS.map((row) => [row.actionType, toBuiltinEntry(row)]),
);

const builtinBySlug = new Map(
  [...builtinByActionType.values()].map((entry) => [entry.slug, entry]),
);

export const BUILTIN_META_ACTION_TYPES: ReadonlySet<string> = new Set(
  BUILTIN_META_ACTION_ROWS.map((row) => row.actionType),
);

export function isBuiltinMetaActionType(actionType: string): boolean {
  return BUILTIN_META_ACTION_TYPES.has(actionType);
}

export function getBuiltinActionCatalogEntry(
  actionType: string,
): ActionCatalogEntry | null {
  return builtinByActionType.get(actionType) ?? null;
}

export function getBuiltinActionCatalogEntryBySlug(
  slug: string,
): ActionCatalogEntry | null {
  return builtinBySlug.get(slug) ?? null;
}

export function listBuiltinActionCatalogEntries(): ActionCatalogEntry[] {
  return [...builtinByActionType.values()];
}
