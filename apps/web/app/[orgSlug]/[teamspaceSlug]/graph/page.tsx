import { Suspense } from "react";
import { GraphWorkspace } from "@/components/console/graph-workspace";
import { GraphContentLoading } from "@/components/console/browse-content-loading";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getGraphPorts } from "@/lib/ports";

export default function GraphPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<GraphContentLoading />}>
      <GraphPageInner params={params} />
    </Suspense>
  );
}

async function GraphPageInner({
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

  return <GraphWorkspace nodeTypes={nodeCatalog} edgeTypes={edgeCatalog} />;
}
