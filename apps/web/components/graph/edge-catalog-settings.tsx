import { notFound } from "next/navigation";
import { Badge } from "@ssota/ui/components/ui/badge";
import { AddEdgeActionSheet } from "@/components/graph/edge-table-actions";
import { getActionPorts } from "@/lib/ports";

type EdgeCatalogSettingsProps = {
  projectId: string;
  slug: string;
};

export async function EdgeCatalogSettings({ projectId, slug }: EdgeCatalogSettingsProps) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getEdgeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const toolbar = (
    <div className="flex flex-wrap gap-2 border-b px-4 py-3">
      <AddEdgeActionSheet edgeType={entry.edgeType} projectId={projectId} />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      {toolbar}
      <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
        <DefinitionItem label="Edge type" value={entry.edgeType} />
        <DefinitionItem label="Slug" value={entry.slug} mono />
        <DefinitionItem label="Cardinality" value={entry.cardinality} />
        <DefinitionItem label="Representation" value={entry.representation} />
        <div className="sm:col-span-2">
          <dt className="mb-2 text-xs font-medium text-muted-foreground">Domain (source)</dt>
          <dd className="flex flex-wrap gap-1.5">
            {entry.domain.map((nodeType) => (
              <Badge key={nodeType} variant="secondary">
                {nodeType}
              </Badge>
            ))}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="mb-2 text-xs font-medium text-muted-foreground">Range (target)</dt>
          <dd className="flex flex-wrap gap-1.5">
            {entry.range.map((nodeType) => (
              <Badge key={nodeType} variant="secondary">
                {nodeType}
              </Badge>
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function DefinitionItem({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={mono ? "mt-1 font-mono text-xs" : "mt-1"}>{value}</dd>
    </div>
  );
}
