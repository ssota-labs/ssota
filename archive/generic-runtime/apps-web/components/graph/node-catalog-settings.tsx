import { notFound } from "next/navigation";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  AddActionSheet,
  AddWorkflowSheet,
  AddPropertySheet,
} from "@/components/graph/node-table-actions";
import { getActionPorts } from "@/lib/ports";

type NodeCatalogSettingsProps = {
  projectId: string;
  slug: string;
};

export async function NodeCatalogSettings({ projectId, slug }: NodeCatalogSettingsProps) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const lifecycle = Object.entries(entry.lifecycleTransitions)
    .map(([from, targets]) => `${from} → ${targets.join(", ") || "—"}`)
    .join("; ");

  const propertyEntries = Object.entries(entry.propertySchema);

  const toolbar = (
    <div className="flex flex-wrap gap-2 border-b px-4 py-3">
      <AddPropertySheet nodeType={entry.nodeType} projectId={projectId} />
      <AddActionSheet nodeType={entry.nodeType} projectId={projectId} />
      <AddWorkflowSheet nodeType={entry.nodeType} projectId={projectId} />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      {toolbar}
      <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
        <DefinitionItem label="Node type" value={entry.nodeType} />
        <DefinitionItem label="Family" value={entry.family} />
        <DefinitionItem label="Archetype" value={entry.archetypeId ?? "—"} />
        <DefinitionItem label="Slug" value={entry.slug} mono />
        <DefinitionItem
          label="Lifecycle"
          value={lifecycle}
          className="sm:col-span-2"
        />
        <DefinitionItem
          label="Content guide"
          value={entry.contentGuide ?? "—"}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <dt className="mb-2 text-xs font-medium text-muted-foreground">Property schema</dt>
          <dd className="flex flex-wrap gap-1.5">
            {propertyEntries.length > 0 ? (
              propertyEntries.map(([key, field]) => (
                <Badge key={key} variant={field.system ? "default" : "secondary"}>
                  {key}
                  {field.system ? " (system)" : ""}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">No properties defined (title auto-injected on write)</span>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="mb-2 text-xs font-medium text-muted-foreground">Allowed actions</dt>
          <dd className="flex flex-wrap gap-1.5">
            {entry.allowedActionRefs.length > 0 ? (
              entry.allowedActionRefs.map((action) => (
                <Badge key={action} variant="outline">
                  {action}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">All project actions allowed</span>
            )}
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
