import { notFound } from "next/navigation";
import { GraphSchemaView } from "@/components/graph/graph-schema-view";
import { getActionPorts } from "@/lib/ports";

export default async function GraphNodeSchemaPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; nodeTypeSlug: string }>;
}) {
  const { nodeTypeSlug } = await params;
  const slug = decodeURIComponent(nodeTypeSlug);
  const ports = getActionPorts();
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  return (
    <GraphSchemaView
      initialSelection={{ kind: "node", slug: entry.slug }}
      title={entry.label}
      description={`${entry.family} · ${entry.archetypeId} · ${entry.propertyRefs.length} properties`}
    />
  );
}
