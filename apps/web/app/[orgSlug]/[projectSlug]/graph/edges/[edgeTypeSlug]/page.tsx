import { notFound } from "next/navigation";
import { GraphSchemaView } from "@/components/graph/graph-schema-view";
import { getActionPorts } from "@/lib/ports";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function GraphEdgeSchemaPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; edgeTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug, edgeTypeSlug } = await params;
  const slug = decodeURIComponent(edgeTypeSlug).toLowerCase();
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
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
