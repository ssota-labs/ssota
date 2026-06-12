import { Suspense } from "react";
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
import { GraphCatalogExplorer } from "@/components/graph/graph-catalog-explorer";
import {
  EdgeTableDetail,
  getEdgeTableMeta,
} from "@/components/graph/edge-table-detail";
import { NewTableButton } from "@/components/graph/table-catalog-panel";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function GraphEdgesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { table } = await searchParams;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const edges = await ports.catalog.listEdgeCatalogEntries();

  const catalogItems = edges.map((edge) => ({
    slug: edge.slug,
    label: edge.label,
    meta: `${edge.domain.join(", ")} → ${edge.range.join(", ")}`,
  }));

  const selectedMeta = table ? await getEdgeTableMeta(project.id, table) : null;

  const newTableTrigger = (
    <Sheet>
      <SheetTrigger render={<NewTableButton>New table</NewTableButton>} />
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

  const sheetContent =
    table && selectedMeta ? (
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading rows…</div>}>
        <EdgeTableDetail projectId={project.id} slug={table} />
      </Suspense>
    ) : null;

  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading catalog…</div>}>
      <GraphCatalogExplorer
        title="Table Editor"
        items={catalogItems}
        newTableTrigger={newTableTrigger}
        sheetTitle={selectedMeta?.label}
        sheetDescription={selectedMeta?.description}
        sheetContent={sheetContent}
        emptyHint="Select an edge table from the catalog to view rows."
      />
    </Suspense>
  );
}
