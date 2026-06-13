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
import { GraphSchemaView } from "@/components/graph/graph-schema-view";
import { getCachedArchetypes } from "@/lib/console/cached-catalog";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function GraphNodesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const archetypes = await getCachedArchetypes(project.id);

  const toolbar = (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>New table</SheetTrigger>
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
            <Label htmlFor="archetypeId">Archetype (선택)</Label>
            <Input
              id="archetypeId"
              name="archetypeId"
              list="archetypes"
              placeholder={archetypes[0]?.id ?? "없음"}
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
            <Label htmlFor="allowedActionRefs">Allowed actions</Label>
            <Input
              id="allowedActionRefs"
              name="allowedActionRefs"
              placeholder="create_node, promote_document"
            />
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
    <GraphSchemaView
      projectId={project.id}
      title="Nodes"
      description="Node catalog and allowed relationships between node types."
      toolbar={toolbar}
    />
  );
}
