import { notFound } from "next/navigation";
import { GraphSchemaView } from "@/components/graph/graph-schema-view";
import { getActionPorts } from "@/lib/ports";

export default async function GraphEdgeSchemaPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; edgeTypeSlug: string }>;
}) {
  const { edgeTypeSlug } = await params;
  const slug = decodeURIComponent(edgeTypeSlug);
  const ports = getActionPorts();
  const entry = await ports.catalog.getEdgeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  return (
    <GraphSchemaView
      initialSelection={{ kind: "edge", slug: entry.slug }}
      title={entry.label}
      description={`${entry.domain.join(", ")} → ${entry.range.join(", ")} · ${entry.cardinality}`}
    />
  );
}
