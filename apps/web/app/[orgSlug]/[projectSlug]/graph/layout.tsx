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
  const [nodeTypes, edgeTypes] = await Promise.all([
    ports.catalog.listNodeCatalogEntries(),
    ports.catalog.listEdgeCatalogEntries(),
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
      }}
    >
      {children}
    </GraphCatalogProvider>
  );
}
