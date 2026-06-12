import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";
import { ActionRunner } from "@/components/graph/node-table-actions";
import { NodeRowsDataTable } from "@/components/graph/node-rows-data-table";
import { projectPath } from "@/lib/console/paths";
import type { ProjectRouteContext } from "@/lib/console/paths";
import { propertyColumnLabel } from "@/lib/graph/property-column-label";
import { getActionPorts } from "@/lib/ports";

type NodeTableDetailProps = {
  ctx: ProjectRouteContext;
  projectId: string;
  slug: string;
};

export async function NodeTableDetail({ ctx, projectId, slug }: NodeTableDetailProps) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const decoded = entry.nodeType;
  const [rows, properties, actions] = await Promise.all([
    ports.graph.queryNodes({ nodeType: decoded, limit: 500 }),
    ports.catalog.listPropertyCatalogEntries(),
    ports.catalog.listActionCatalogEntries(),
  ]);

  const propertyKeys =
    entry.propertyRefs.length > 0
      ? entry.propertyRefs
      : Array.from(new Set(rows.flatMap((row) => Object.keys(row.properties))));

  const propertyByKey = new Map(properties.map((property) => [property.propertyKey, property]));
  const propertyColumns = propertyKeys.map((key) => {
    const catalog = propertyByKey.get(key);
    return {
      key,
      label: propertyColumnLabel(key),
      valueType: catalog?.valueType ?? "unknown",
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
    <>
      <Button
        render={<Link href={projectPath(ctx, "log")} />}
        variant="outline"
        size="sm"
        nativeButton={false}
      >
        View logs
      </Button>
      <ActionRunner
        projectId={projectId}
        actions={
          localActions.length
            ? localActions.map((action) => action.actionType)
            : actions.map((action) => action.actionType)
        }
      />
    </>
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
  return {
    label: entry.label,
    description: `${entry.family} · ${entry.archetypeId} · ${entry.propertyRefs.length} properties`,
  };
}
