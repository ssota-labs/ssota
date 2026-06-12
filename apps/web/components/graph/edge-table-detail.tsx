import { notFound } from "next/navigation";
import { RunEdgeActionSheet } from "@/components/graph/edge-table-actions";
import { EdgeRowsDataTable } from "@/components/graph/edge-rows-data-table";
import { propertyColumnLabel } from "@/lib/graph/property-column-label";
import { getActionPorts } from "@/lib/ports";

type EdgeTableDetailProps = {
  projectId: string;
  slug: string;
};

export async function EdgeTableDetail({ projectId, slug }: EdgeTableDetailProps) {
  const ports = getActionPorts(projectId);
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
      <RunEdgeActionSheet edgeType={decoded} projectId={projectId} />
    </div>
  );

  return (
    <EdgeRowsDataTable
      rows={tableRows}
      propertyColumns={propertyColumns}
      toolbar={toolbar}
    />
  );
}

export async function getEdgeTableMeta(projectId: string, slug: string) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getEdgeCatalogEntryBySlug(slug);
  if (!entry) return null;
  return {
    label: entry.label,
    description: `${entry.domain.join(", ")} → ${entry.range.join(", ")} · ${entry.cardinality}`,
  };
}

function nodeLabel(
  nodeById: Map<string, { properties: Record<string, unknown> }>,
  nodeId: string,
) {
  const title = nodeById.get(nodeId)?.properties.title;
  return typeof title === "string" ? title : nodeId.slice(0, 8);
}
