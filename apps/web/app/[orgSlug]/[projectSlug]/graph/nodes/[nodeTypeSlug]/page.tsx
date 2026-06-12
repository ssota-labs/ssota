import { notFound } from "next/navigation";
import { GraphSchemaView } from "@/components/graph/graph-schema-view";
import { getActionPorts } from "@/lib/ports";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function GraphNodeSchemaPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; nodeTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug, nodeTypeSlug } = await params;
  const slug = decodeURIComponent(nodeTypeSlug).toLowerCase();
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const propertyCount = Object.keys(entry.propertySchema ?? {}).length;

  return (
    <GraphSchemaView
      initialSelection={{ kind: "node", slug: entry.slug }}
      title={entry.label}
      description={`${entry.family} · ${entry.archetypeId ?? "—"} · ${propertyCount} properties`}
    />
  );
}
