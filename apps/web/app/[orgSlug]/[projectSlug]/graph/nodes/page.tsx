import { Button } from "@loopos/ui/components/ui/button";
import { Input } from "@loopos/ui/components/ui/input";
import { Label } from "@loopos/ui/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@loopos/ui/components/ui/sheet";
import { Textarea } from "@loopos/ui/components/ui/textarea";
import { createNodeTableFormAction } from "@/app/actions";
import { GraphSchemaView } from "@/components/graph/graph-schema-view";
import { getActionPorts } from "@/lib/ports";

export default async function GraphNodesPage() {
  const ports = getActionPorts();
  const archetypes = await ports.catalog.listArchetypes();

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
    <GraphSchemaView
      title="Nodes"
      description="Node catalog and allowed relationships between node types."
      toolbar={toolbar}
    />
  );
}
