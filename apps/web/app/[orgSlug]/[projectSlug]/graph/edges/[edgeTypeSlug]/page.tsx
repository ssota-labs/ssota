import { notFound } from "next/navigation";
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
import { defineScopedActionFormAction, runActionJsonFormAction } from "@/app/actions";
import { EdgeRowsDataTable } from "@/components/graph/edge-rows-data-table";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function GraphEdgeTablePage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; edgeTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug, edgeTypeSlug } = await params;
  const slug = decodeURIComponent(edgeTypeSlug);
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const entry = await ports.catalog.getEdgeCatalogEntryBySlug(slug);
  if (!entry) notFound();
  const decoded = entry.edgeType;
  const [nodes, actions] = await Promise.all([
    ports.graph.queryNodes({ limit: 100 }),
    ports.catalog.listActionCatalogEntries(),
  ]);

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

  const tableRows = rows.map((edge) => ({
    id: edge.id,
    source: nodeLabel(nodeById, edge.sourceNodeId),
    target: nodeLabel(nodeById, edge.targetNodeId),
    properties: JSON.stringify(edge.properties),
    createdAt: edge.createdAt.toISOString(),
  }));

  const toolbar = (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <RunEdgeActionSheet edgeType={decoded} projectId={project.id} />
      <AddEdgeActionSheet edgeType={decoded} projectId={project.id} />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">{entry.label}</h1>
        <p className="text-xs text-muted-foreground">
          {entry.domain.join(", ")} → {entry.range.join(", ")} · {entry.cardinality}
        </p>
      </div>
      <EdgeRowsDataTable rows={tableRows} toolbar={toolbar} />
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

function RunEdgeActionSheet({
  edgeType,
  projectId,
}: {
  edgeType: string;
  projectId: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>Create edge / Run action</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Run edge action</SheetTitle>
          <SheetDescription>create_edge action input을 JSON으로 제출합니다.</SheetDescription>
        </SheetHeader>
        <form action={runActionJsonFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
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

function AddEdgeActionSheet({
  edgeType,
  projectId,
}: {
  edgeType: string;
  projectId: string;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>Add action</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add action to {edgeType}</SheetTitle>
          <SheetDescription>scope=edge_type:{edgeType}로 action contract를 생성합니다.</SheetDescription>
        </SheetHeader>
        <form action={defineScopedActionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
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
