import { GraphWorkspace } from "@/components/console/graph-workspace";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getGraphPorts } from "@/lib/ports";
import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts/catalog";

export default async function GraphPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const { catalog } = await getGraphPorts(project.id);

  const [nodeCatalog, edgeCatalog] = await Promise.all([
    catalog.listNodeCatalog(),
    catalog.listEdgeCatalog(),
  ]);

  return (
    <div className="relative min-h-0 flex-1">
      <GraphWorkspace
        nodeTypes={nodeCatalog.map((row: NodeCatalogRow) => ({
          key: row.key,
          title: row.label,
        }))}
        edgeTypes={edgeCatalog.map((row: EdgeCatalogRow) => ({
          key: row.key,
          title: row.label,
        }))}
      />
    </div>
  );
}
