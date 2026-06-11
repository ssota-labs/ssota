import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";
import {
  ActionRunner,
  AddActionSheet,
  AddInstructionSheet,
  AddPropertySheet,
} from "@/components/graph/node-table-actions";
import { NodeRowsDataTable } from "@/components/graph/node-rows-data-table";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { propertyColumnLabel } from "@/lib/graph/property-column-label";
import { getActionPorts } from "@/lib/ports";

export default async function GraphNodeTablePage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; nodeTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug, nodeTypeSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const slug = decodeURIComponent(nodeTypeSlug);
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const decoded = entry.nodeType;
  const [rows, properties, actions, instructions] = await Promise.all([
    ports.graph.queryNodes({ nodeType: decoded, limit: 500 }),
    ports.catalog.listPropertyCatalogEntries(),
    ports.catalog.listActionCatalogEntries(),
    ports.catalog.listInstructions({ limit: 100 }),
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
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <ActionRunner
        projectId={project.id}
        actions={
          localActions.length
            ? localActions.map((action) => action.actionType)
            : actions.map((action) => action.actionType)
        }
      />
      <AddPropertySheet nodeType={decoded} projectId={project.id} />
      <AddActionSheet nodeType={decoded} projectId={project.id} />
      <AddInstructionSheet nodeType={decoded} projectId={project.id} />
      <Button
        render={<Link href={projectPath(ctx, "log")} />}
        variant="outline"
        size="sm"
        nativeButton={false}
      >
        View logs
      </Button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">{entry.label}</h1>
        <p className="text-xs text-muted-foreground">
          {entry.family} · {entry.archetypeId} · {propertyKeys.length} properties
        </p>
      </div>
      <NodeRowsDataTable
        rows={tableRows}
        propertyColumns={propertyColumns}
        toolbar={toolbar}
      />
    </div>
  );
}
