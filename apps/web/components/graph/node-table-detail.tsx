import { notFound } from "next/navigation";
import { ActionRunner } from "@/components/graph/node-table-actions";
import { NodeRowsDataTable } from "@/components/graph/node-rows-data-table";
import { propertyColumnLabel } from "@/lib/graph/property-column-label";
import { getActionPorts } from "@/lib/ports";

type NodeTableDetailProps = {
  projectId: string;
  slug: string;
};

export async function NodeTableDetail({ projectId, slug }: NodeTableDetailProps) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const decoded = entry.nodeType;
  const [rows, actions] = await Promise.all([
    ports.graph.queryNodes({ nodeType: decoded, limit: 500 }),
    ports.catalog.listActionCatalogEntries(),
  ]);

  const schemaKeys = Object.keys(entry.propertySchema);
  const propertyKeys =
    schemaKeys.length > 0
      ? schemaKeys
      : Array.from(new Set(rows.flatMap((row) => Object.keys(row.properties))));

  const propertyColumns = propertyKeys.map((key) => {
    const field = entry.propertySchema[key];
    return {
      key,
      label: propertyColumnLabel(key),
      valueType: field?.valueType ?? "unknown",
    };
  });

  const localActions = actions.filter((action) => {
    if (entry.allowedActionRefs.includes(action.actionType)) return true;
    if (action.scope.kind === "node_type") return action.scope.nodeType === decoded;
    if (action.scope.kind === "property") return action.scope.nodeType === decoded;
    return false;
  });

  const tableRows = rows.map((row) => ({
    id: row.id,
    lifecycleStatus: row.lifecycleStatus,
    properties: row.properties,
    content: row.content ?? row.contentUrl ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const toolbar = (
    <ActionRunner
      projectId={projectId}
      actions={
        localActions.length
          ? localActions.map((action) => action.actionType)
          : actions.map((action) => action.actionType)
      }
    />
  );

  return (
    <NodeRowsDataTable
      rows={tableRows}
      propertyColumns={propertyColumns}
      toolbar={toolbar}
    />
  );
}

export async function getNodeTableMeta(projectId: string, slug: string) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) return null;
  const propertyCount = Object.keys(entry.propertySchema).length;
  return {
    label: entry.label,
    description: `${entry.family} · ${entry.archetypeId ?? "no archetype"} · ${propertyCount} properties`,
  };
}
