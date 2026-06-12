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
import { createEdgeTableFormAction } from "@/app/actions";
import { GraphSchemaView } from "@/components/graph/graph-schema-view";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function GraphEdgesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);

  const toolbar = (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>New table</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New edge table</SheetTitle>
          <SheetDescription>define_edge_type 메타 액션을 실행합니다.</SheetDescription>
        </SheetHeader>
        <form action={createEdgeTableFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="space-y-2">
            <Label htmlFor="edgeType">Key</Label>
            <Input id="edgeType" name="edgeType" placeholder="cites" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Source node types</Label>
            <Input id="domain" name="domain" placeholder="Document, Note" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="range">Target node types</Label>
            <Input id="range" name="range" placeholder="Document, Instruction" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardinality">Cardinality</Label>
            <Input id="cardinality" name="cardinality" defaultValue="many-to-many" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="representation">Representation</Label>
            <Input id="representation" name="representation" defaultValue="directed" required />
          </div>
          <Button type="submit">Create edge table</Button>
        </form>
      </SheetContent>
    </Sheet>
  );

  return (
    <GraphSchemaView
      title="Edges"
      description="Relationships between node types defined in the edge catalog."
      toolbar={toolbar}
    />
  );
}
