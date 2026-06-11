import { GraphCatalogProvider } from "@/components/console/graph-catalog-context";
import { getActionPorts } from "@/lib/ports";

export default async function GraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ports = getActionPorts();
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
