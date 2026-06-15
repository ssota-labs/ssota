import type { Effect, ExecutorType } from "@ssota/contracts";
import type { ActionCatalogEntry } from "../domain/types.js";
import { toCatalogLabel, toCatalogSlug } from "../catalog-slug.js";

type BuiltinTaskActionRow = {
  actionType: string;
  preconditions: Record<string, unknown>;
  effects: Record<string, unknown>[];
  executor: ExecutorType;
  allowedLifecycleTransitions: Record<string, string[]>;
  failureMode: string;
  idempotencyRule: string | null;
  logPayloadSchema: Record<string, unknown>;
};

const BUILTIN_TASK_ACTION_ROWS: BuiltinTaskActionRow[] = [
  {
    actionType: "spawn_task",
    preconditions: { requiredFields: ["title", "workflowKey"] },
    effects: [
      {
        kind: "create_task",
        task: {
          title: "",
          workflowKey: "",
          status: "pending",
          executorType: "Agent",
          context: {},
          acceptanceCriteria: [],
        },
      },
    ],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: "key",
    logPayloadSchema: {},
  },
];

function toBuiltinEntry(row: BuiltinTaskActionRow): ActionCatalogEntry {
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

const taskBuiltinByActionType = new Map(
  BUILTIN_TASK_ACTION_ROWS.map((row) => [row.actionType, toBuiltinEntry(row)]),
);

const taskBuiltinBySlug = new Map(
  [...taskBuiltinByActionType.values()].map((entry) => [entry.slug, entry]),
);

export const BUILTIN_TASK_ACTION_TYPES: ReadonlySet<string> = new Set(
  BUILTIN_TASK_ACTION_ROWS.map((row) => row.actionType),
);

export function isBuiltinTaskActionType(actionType: string): boolean {
  return BUILTIN_TASK_ACTION_TYPES.has(actionType);
}

export function getBuiltinTaskActionCatalogEntry(
  actionType: string,
): ActionCatalogEntry | null {
  return taskBuiltinByActionType.get(actionType) ?? null;
}

export function getBuiltinTaskActionCatalogEntryBySlug(
  slug: string,
): ActionCatalogEntry | null {
  return taskBuiltinBySlug.get(slug) ?? null;
}

export function listBuiltinTaskActionCatalogEntries(): ActionCatalogEntry[] {
  return [...taskBuiltinByActionType.values()];
}
