import { notFound } from "next/navigation";
import { AddEdgeActionSheet, RunEdgeActionSheet } from "@/components/graph/edge-table-actions";
import { EdgeRowsDataTable } from "@/components/graph/edge-rows-data-table";
import { propertyColumnLabel } from "@/lib/graph/property-column-label";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function GraphEdgeTablePage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; edgeTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug, edgeTypeSlug } = await params;
  const slug = decodeURIComponent(edgeTypeSlug);
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const entry = await ports.catalog.getEdgeCatalogEntryBySlug(slug);
  if (!entry) notFound();
  const decoded = entry.edgeType;
  const [nodes, properties] = await Promise.all([
    ports.graph.queryNodes({ limit: 100 }),
    ports.catalog.listPropertyCatalogEntries(),
  ]);

  const edgeMap = new Map<string, Awaited<ReturnType<typeof ports.graph.traverseEdges>>[number]>();
  for (const node of nodes) {
    const traversed = await ports.graph.traverseEdges({
      nodeId: node.id,
      direction: "outgoing",
      edgeType: decoded,
    });
    for (const edge of traversed) edgeMap.set(edge.id, edge);
  }
  const rows = [...edgeMap.values()];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const propertyKeys = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.properties))),
  );
  const propertyByKey = new Map(properties.map((property) => [property.propertyKey, property]));
  const propertyColumns = propertyKeys.map((key) => {
    const catalog = propertyByKey.get(key);
    return {
      key,
      label: propertyColumnLabel(key),
      valueType: catalog?.valueType ?? "unknown",
    };
  });

  const tableRows = rows.map((edge) => ({
    id: edge.id,
    source: nodeLabel(nodeById, edge.sourceNodeId),
    target: nodeLabel(nodeById, edge.targetNodeId),
    properties: edge.properties,
    createdAt: edge.createdAt.toISOString(),
  }));

  const toolbar = (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <RunEdgeActionSheet edgeType={decoded} projectId={project.id} />
      <AddEdgeActionSheet edgeType={decoded} projectId={project.id} />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">{entry.label}</h1>
        <p className="text-xs text-muted-foreground">
          {entry.domain.join(", ")} → {entry.range.join(", ")} · {entry.cardinality} ·{" "}
          {propertyKeys.length} properties
        </p>
      </div>
      <EdgeRowsDataTable
        rows={tableRows}
        propertyColumns={propertyColumns}
        toolbar={toolbar}
      />
    </div>
  );
}

function nodeLabel(
  nodeById: Map<string, { properties: Record<string, unknown> }>,
  nodeId: string,
) {
  const title = nodeById.get(nodeId)?.properties.title;
  return typeof title === "string" ? title : nodeId.slice(0, 8);
}
