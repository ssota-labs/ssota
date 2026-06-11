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
import { createEdgeTableFormAction } from "@/app/actions";
import { EdgeCatalogDataTable } from "@/components/graph/edge-catalog-data-table";
import { graphPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function GraphEdgesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const edges = await ports.catalog.listEdgeCatalogEntries();

  if (edges.length === 1) {
    redirect(graphPath(ctx, "edges", edges[0]!.slug));
  }

  const tableData = edges.map((edge) => ({
    label: edge.label,
    domain: edge.domain.join(", "),
    range: edge.range.join(", "),
    cardinality: edge.cardinality,
    representation: edge.representation,
    href: graphPath(ctx, "edges", edge.slug),
  }));

  const toolbar = (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>New edge table</SheetTrigger>
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Edges</h1>
        <p className="text-xs text-muted-foreground">
          Edge tables define allowed relationships between node tables.
        </p>
      </div>
      <EdgeCatalogDataTable data={tableData} toolbar={toolbar} />
    </div>
  );
}
