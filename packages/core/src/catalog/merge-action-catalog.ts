import type { ActionCatalogEntry } from "../domain/types.js";
import {
  getBuiltinActionCatalogEntry,
  getBuiltinActionCatalogEntryBySlug,
  isBuiltinActionType,
  listBuiltinActionCatalogEntries,
} from "./builtin-actions.js";

function withProjectSource(entry: ActionCatalogEntry): ActionCatalogEntry {
  return entry.catalogSource ? entry : { ...entry, catalogSource: "project" };
}

export function mergeActionCatalogEntry(
  projectEntry: ActionCatalogEntry | null,
  actionType: string,
): ActionCatalogEntry | null {
  const builtin = getBuiltinActionCatalogEntry(actionType);
  if (builtin) return builtin;
  return projectEntry ? withProjectSource(projectEntry) : null;
}

export function mergeActionCatalogEntryBySlug(
  projectEntry: ActionCatalogEntry | null,
  slug: string,
): ActionCatalogEntry | null {
  const builtin = getBuiltinActionCatalogEntryBySlug(slug);
  if (builtin) return builtin;
  return projectEntry ? withProjectSource(projectEntry) : null;
}

export function mergeActionCatalogEntries(
  projectEntries: ActionCatalogEntry[],
): ActionCatalogEntry[] {
  const projectByType = new Map(
    projectEntries
      .filter((entry) => !isBuiltinActionType(entry.actionType))
      .map((entry) => [entry.actionType, withProjectSource(entry)]),
  );
  return [...listBuiltinActionCatalogEntries(), ...projectByType.values()];
}
