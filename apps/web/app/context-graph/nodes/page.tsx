import Link from "next/link";
import { Button } from "@ssota/ui/components/ui/button";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { createNodeTableFormAction } from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";

export default async function ContextGraphNodesPage() {
  const ports = getActionPorts();
  const [nodeTypes, archetypes] = await Promise.all([
    ports.catalog.listNodeCatalogEntries(),
    ports.catalog.listArchetypes(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nodes"
        description="Node tables define structured context envelopes and runtime node instances."
      />

      <div className="flex justify-end">
        <Sheet>
          <SheetTrigger render={<Button />}>New node table</SheetTrigger>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Node tables</CardTitle>
          <CardDescription>
            Properties are shown as columns and writes are submitted as actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Archetype</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Lifecycle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodeTypes.map((nodeType) => (
                <TableRow key={nodeType.nodeType}>
                  <TableCell className="font-medium">
                    <Link href={`/context-graph/nodes/${nodeType.nodeType}`} className="hover:underline">
                      {nodeType.nodeType}
                    </Link>
                  </TableCell>
                  <TableCell>{nodeType.family}</TableCell>
                  <TableCell>{nodeType.archetypeId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{nodeType.propertyRefs.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{nodeType.allowedActionRefs.length || "all"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {Object.keys(nodeType.lifecycleTransitions).join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
