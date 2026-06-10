import { notFound } from "next/navigation";
import { Badge } from "@loopos/ui/components/ui/badge";
import { Button } from "@loopos/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@loopos/ui/components/ui/table";
import { Textarea } from "@loopos/ui/components/ui/textarea";
import { defineScopedActionFormAction, runActionJsonFormAction } from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";

export default async function ContextGraphEdgeTablePage({
  params,
}: {
  params: Promise<{ edgeType: string }>;
}) {
  const { edgeType } = await params;
  const decoded = decodeURIComponent(edgeType);
  const ports = getActionPorts();
  const [entry, nodes, actions] = await Promise.all([
    ports.catalog.getEdgeCatalogEntry(decoded),
    ports.graph.queryNodes({ limit: 100 }),
    ports.catalog.listActionCatalogEntries(),
  ]);

  if (!entry) notFound();

  const edgeMap = new Map<string, Awaited<ReturnType<typeof ports.graph.traverseEdges>>[number]>();
  for (const node of nodes) {
    const traversed = await ports.graph.traverseEdges({
      nodeId: node.id,
      direction: "outgoing",
      edgeType: decoded,
    });
    for (const edge of traversed) edgeMap.set(edge.id, edge);
  }
  const rows = [...edgeMap.values()];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const localActions = actions.filter(
    (action) => action.scope.kind === "edge_type" && action.scope.edgeType === decoded,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={entry.edgeType}
        description={`Edge table · ${entry.domain.join(", ")} -> ${entry.range.join(", ")} · ${entry.cardinality}`}
      />

      <div className="flex flex-wrap gap-2">
        <RunEdgeActionSheet edgeType={decoded} />
        <AddEdgeActionSheet edgeType={decoded} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Constraints</CardTitle>
          <CardDescription>create_edge effects must match these endpoint constraints.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">source: {entry.domain.join(", ")}</Badge>
          <Badge variant="secondary">target: {entry.range.join(", ")}</Badge>
          <Badge variant="secondary">{entry.representation}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rows</CardTitle>
          <CardDescription>Runtime edges for this type.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>source</TableHead>
                <TableHead>target</TableHead>
                <TableHead>properties</TableHead>
                <TableHead>created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    아직 생성된 edge row가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((edge) => (
                  <TableRow key={edge.id}>
                    <TableCell>{nodeLabel(nodeById, edge.sourceNodeId)}</TableCell>
                    <TableCell>{nodeLabel(nodeById, edge.targetNodeId)}</TableCell>
                    <TableCell className="font-mono text-xs">{JSON.stringify(edge.properties)}</TableCell>
                    <TableCell className="text-muted-foreground">{edge.createdAt.toISOString().slice(0, 10)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Local actions</CardTitle>
          <CardDescription>Actions scoped to this edge table.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {localActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">이 edge table에 scoped된 action이 없습니다.</p>
          ) : (
            localActions.map((action) => (
              <div key={action.actionType} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{action.actionType}</div>
                <div className="text-muted-foreground">{action.executor}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function nodeLabel(
  nodeById: Map<string, { properties: Record<string, unknown> }>,
  nodeId: string,
) {
  const title = nodeById.get(nodeId)?.properties.title;
  return typeof title === "string" ? title : nodeId.slice(0, 8);
}

function RunEdgeActionSheet({ edgeType }: { edgeType: string }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button />}>Create edge / Run action</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Run edge action</SheetTitle>
          <SheetDescription>create_edge action input을 JSON으로 제출합니다.</SheetDescription>
        </SheetHeader>
        <form action={runActionJsonFormAction} className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="input">Input JSON</Label>
            <Textarea
              id="input"
              name="input"
              defaultValue={`{ "edgeType": "${edgeType}", "sourceNodeId": "", "targetNodeId": "", "properties": {} }`}
            />
          </div>
          <Button type="submit">Submit action</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function AddEdgeActionSheet({ edgeType }: { edgeType: string }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Add action</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add action to {edgeType}</SheetTitle>
          <SheetDescription>scope=edge_type:{edgeType}로 action contract를 생성합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineScopedActionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="scopeKind" value="edge_type" />
          <input type="hidden" name="edgeType" value={edgeType} />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="executor">Executor</Label>
            <Input id="executor" name="executor" defaultValue="Agent" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effects">Effects JSON array</Label>
            <Textarea id="effects" name="effects" defaultValue="[]" />
          </div>
          <Button type="submit">Submit action contract</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
