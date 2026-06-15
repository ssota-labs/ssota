import { GraphCatalogProvider } from "@/components/console/graph-catalog-context";
import {
  displayNodeCatalogLabel,
  getCachedActionCatalog,
  getCachedEdgeCatalog,
  getCachedNodeCatalog,
} from "@/lib/console/cached-catalog";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function GraphLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const [nodeTypes, edgeTypes, actionTypes] = await Promise.all([
    getCachedNodeCatalog(project.id),
    getCachedEdgeCatalog(project.id),
    getCachedActionCatalog(project.id),
  ]);

  return (
    <GraphCatalogProvider
      value={{
        nodeTypes: nodeTypes.map((entry) => ({
          slug: entry.slug,
          label: displayNodeCatalogLabel(entry),
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
