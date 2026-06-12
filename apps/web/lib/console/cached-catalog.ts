import { cache } from "react";
import { getActionPorts } from "@/lib/ports";

export const getCachedNodeCatalog = cache(async (projectId: string) => {
  return getActionPorts(projectId).catalog.listNodeCatalogEntries();
});

export const getCachedEdgeCatalog = cache(async (projectId: string) => {
  return getActionPorts(projectId).catalog.listEdgeCatalogEntries();
});

export const getCachedActionCatalog = cache(async (projectId: string) => {
  return getActionPorts(projectId).catalog.listActionCatalogEntries();
});

export const getCachedArchetypes = cache(async (projectId: string) => {
  return getActionPorts(projectId).catalog.listArchetypes();
});
