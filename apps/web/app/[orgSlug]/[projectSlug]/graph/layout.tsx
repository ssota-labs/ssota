import { GraphCatalogProvider } from "@/components/console/graph-catalog-context";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function GraphLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const [nodeTypes, edgeTypes, actionTypes] = await Promise.all([
    ports.catalog.listNodeCatalogEntries(),
    ports.catalog.listEdgeCatalogEntries(),
    ports.catalog.listActionCatalogEntries(),
  ]);

  return (
    <GraphCatalogProvider
      value={{
        nodeTypes: nodeTypes.map((entry) => ({
          slug: entry.slug,
          label: entry.label,
          kind: "node" as const,
        })),
        edgeTypes: edgeTypes.map((entry) => ({
          slug: entry.slug,
          label: entry.label,
          kind: "edge" as const,
        })),
        actionTypes: actionTypes.map((entry) => ({
          slug: entry.slug,
          label: entry.label,
          kind: "action" as const,
        })),
      }}
    >
      {children}
    </GraphCatalogProvider>
  );
}
