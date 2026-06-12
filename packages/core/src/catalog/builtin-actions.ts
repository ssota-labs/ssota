import type { ActionCatalogEntry } from "../domain/types.js";
import {
  BUILTIN_META_ACTION_TYPES,
  getBuiltinActionCatalogEntry as getBuiltinMetaActionCatalogEntry,
  getBuiltinActionCatalogEntryBySlug as getBuiltinMetaActionCatalogEntryBySlug,
  listBuiltinActionCatalogEntries as listBuiltinMetaActionCatalogEntries,
} from "./builtin-meta-actions.js";
import {
  BUILTIN_GRAPH_ACTION_TYPES,
  getBuiltinGraphActionCatalogEntry,
  getBuiltinGraphActionCatalogEntryBySlug,
  listBuiltinGraphActionCatalogEntries,
} from "./builtin-graph-actions.js";

export const BUILTIN_ACTION_TYPES: ReadonlySet<string> = new Set([
  ...BUILTIN_META_ACTION_TYPES,
  ...BUILTIN_GRAPH_ACTION_TYPES,
]);

export function isBuiltinActionType(actionType: string): boolean {
  return BUILTIN_ACTION_TYPES.has(actionType);
}

export function getBuiltinActionCatalogEntry(
  actionType: string,
): ActionCatalogEntry | null {
  return (
    getBuiltinMetaActionCatalogEntry(actionType) ??
    getBuiltinGraphActionCatalogEntry(actionType)
  );
}

export function getBuiltinActionCatalogEntryBySlug(
  slug: string,
): ActionCatalogEntry | null {
  return (
    getBuiltinMetaActionCatalogEntryBySlug(slug) ??
    getBuiltinGraphActionCatalogEntryBySlug(slug)
  );
}

export function listBuiltinActionCatalogEntries(): ActionCatalogEntry[] {
  return [
    ...listBuiltinMetaActionCatalogEntries(),
    ...listBuiltinGraphActionCatalogEntries(),
  ];
}
