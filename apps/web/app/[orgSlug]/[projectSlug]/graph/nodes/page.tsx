import { redirect } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ssota/ui/components/ui/sheet";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { createNodeTableFormAction } from "@/app/actions";
import { NodeCatalogDataTable } from "@/components/graph/node-catalog-data-table";
import { graphPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function GraphNodesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const [nodeTypes, archetypes] = await Promise.all([
    ports.catalog.listNodeCatalogEntries(),
    ports.catalog.listArchetypes(),
  ]);

  if (nodeTypes.length === 1) {
    redirect(graphPath(ctx, "nodes", nodeTypes[0]!.slug));
  }

  const tableData = nodeTypes.map((nodeType) => ({
    slug: nodeType.slug,
    label: nodeType.label,
    family: nodeType.family,
    archetypeId: nodeType.archetypeId,
    propertyCount: nodeType.propertyRefs.length,
    actionCount: nodeType.allowedActionRefs.length,
    lifecycle: Object.keys(nodeType.lifecycleTransitions).join(", "),
    href: graphPath(ctx, "nodes", nodeType.slug),
  }));

  const toolbar = (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>New node table</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New node table</SheetTitle>
          <SheetDescription>
            define_node_type 메타 액션으로 Context Graph에 새 node table을 추가합니다.
          </SheetDescription>
        </SheetHeader>
        <form action={createNodeTableFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="space-y-2">
            <Label htmlFor="nodeType">Key</Label>
            <Input id="nodeType" name="nodeType" placeholder="DecisionInput" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="family">Family</Label>
            <Input id="family" name="family" defaultValue="document" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="archetypeId">Archetype</Label>
            <Input
              id="archetypeId"
              name="archetypeId"
              list="archetypes"
              placeholder={archetypes[0]?.id ?? "doc-note"}
              required
            />
            <datalist id="archetypes">
              {archetypes.map((archetype) => (
                <option key={archetype.id} value={archetype.id}>
                  {archetype.name}
                </option>
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyRefs">Initial properties</Label>
            <Input id="propertyRefs" name="propertyRefs" placeholder="title, authority_level" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowedActionRefs">Allowed actions</Label>
            <Input id="allowedActionRefs" name="allowedActionRefs" placeholder="create_document" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contentGuide">Content guide</Label>
            <Textarea id="contentGuide" name="contentGuide" />
          </div>
          <Button type="submit">Create node table</Button>
        </form>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Nodes</h1>
        <p className="text-xs text-muted-foreground">
          Node tables define structured context envelopes and runtime node instances.
        </p>
      </div>
      <NodeCatalogDataTable data={tableData} toolbar={toolbar} />
    </div>
  );
}
