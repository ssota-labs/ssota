import { Suspense } from "react";
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
import { GraphCatalogExplorer } from "@/components/graph/graph-catalog-explorer";
import { NewTableButton } from "@/components/graph/table-catalog-panel";
import { NodeCatalogSettings } from "@/components/graph/node-catalog-settings";
import {
  getNodeTableMeta,
  NodeTableDetail,
} from "@/components/graph/node-table-detail";
import {
  getCachedArchetypes,
  getCachedNodeCatalog,
} from "@/lib/console/cached-catalog";
import { graphPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function GraphNodesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ table?: string; definition?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { table, definition } = await searchParams;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const [nodeTypes, archetypes] = await Promise.all([
    getCachedNodeCatalog(project.id),
    getCachedArchetypes(project.id),
  ]);

  if (!table && nodeTypes.length === 1) {
    redirect(`${graphPath(ctx, "nodes")}?table=${encodeURIComponent(nodeTypes[0]!.slug)}`);
  }

  const selectedMeta = table ? await getNodeTableMeta(project.id, table) : null;

  const newTableTrigger = (
    <Sheet>
      <SheetTrigger render={<NewTableButton />}>New table</SheetTrigger>
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
            <Input id="allowedActionRefs" name="allowedActionRefs" placeholder="create_node, promote_document" />
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

  const mainContent =
    table && selectedMeta ? (
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading rows…</div>}>
        <NodeTableDetail projectId={project.id} slug={table} />
      </Suspense>
    ) : null;

  const catalogSheetContent =
    table && selectedMeta && definition === "1" ? (
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading definition…</div>}>
        <NodeCatalogSettings projectId={project.id} slug={table} />
      </Suspense>
    ) : null;

  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading catalog…</div>}>
      <GraphCatalogExplorer
        kind="node"
        newTableTrigger={newTableTrigger}
        mainHeader={
          selectedMeta
            ? { title: selectedMeta.label, description: selectedMeta.description }
            : null
        }
        mainContent={mainContent}
        catalogSheetTitle={selectedMeta ? `Definition · ${selectedMeta.label}` : undefined}
        catalogSheetDescription={selectedMeta?.description}
        catalogSheetContent={catalogSheetContent}
        emptyHint="Select a node table from the catalog to view instance rows."
      />
    </Suspense>
  );
}
