import { toCatalogLabel, toCatalogSlug } from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export const DEFAULT_LIFECYCLE_TRANSITIONS = {
  Draft: ["Active", "Archived"],
  Active: ["Archived", "Draft"],
  Archived: ["Active"],
  Deleted: [],
} as const;

export type MetaActionCatalogRow = {
  actionType: string;
  preconditions: Record<string, unknown>;
  effects: Record<string, unknown>[];
  executor: "Agent" | "Human";
  allowedLifecycleTransitions: Record<string, string[]>;
  failureMode: string;
  idempotencyRule: string | null;
  logPayloadSchema: Record<string, unknown>;
};

/** Project-scoped meta actions. All open to Agent except approve_gate. */
export const META_ACTION_CATALOG_ROWS: MetaActionCatalogRow[] = [
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
          lifecycleTransitions: DEFAULT_LIFECYCLE_TRANSITIONS,
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
          lifecycleTransitions: DEFAULT_LIFECYCLE_TRANSITIONS,
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
    actionType: "define_property",
    preconditions: { requiredFields: ["definition"] },
    effects: [
      {
        kind: "upsert_property_catalog_entry",
        entry: {
          propertyKey: "",
          valueType: "string",
          constraints: {},
          owningActions: [],
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
    actionType: "update_property",
    preconditions: { requiredFields: ["propertyKey", "patch"] },
    effects: [
      {
        kind: "upsert_property_catalog_entry",
        entry: {
          propertyKey: "",
          valueType: "string",
          constraints: {},
          owningActions: [],
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
    actionType: "deprecate_property",
    preconditions: { requiredFields: ["propertyKey"] },
    effects: [{ kind: "deprecate_property_catalog_entry", propertyKey: "" }],
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

export async function seedMetaActionCatalog(
  db: Db,
  projectId: string,
): Promise<void> {
  const values = META_ACTION_CATALOG_ROWS.map((row) => ({
    ...row,
    projectId,
    slug: toCatalogSlug(row.actionType),
    label: toCatalogLabel(row.actionType),
    executor: row.executor as "Agent" | "Human" | "System",
  })) as (typeof schema.actionCatalog.$inferInsert)[];

  await db.insert(schema.actionCatalog).values(values).onConflictDoNothing();
}
