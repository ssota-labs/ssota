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
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { defineScopedActionFormAction } from "@/app/actions";
import { ActionCatalogDataTable } from "@/components/graph/action-catalog-data-table";
import { GraphCatalogExplorer } from "@/components/graph/graph-catalog-explorer";
import { NewTableButton } from "@/components/graph/table-catalog-panel";
import { graphPath } from "@/lib/console/paths";
import { formatActionScope } from "@/lib/graph/format-scope";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function GraphActionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const [actions, logs] = await Promise.all([
    ports.catalog.listActionCatalogEntries(),
    ports.commit.getActionLog({ limit: 100 }),
  ]);

  const runCounts = new Map<string, number>();
  for (const log of logs) runCounts.set(log.actionType, (runCounts.get(log.actionType) ?? 0) + 1);

  const tableData = actions.map((action) => ({
    slug: action.slug,
    label: action.label,
    actionType: action.actionType,
    scope: formatActionScope(action.scope),
    executor: action.executor,
    effectsCount: action.effects.length,
    runs: runCounts.get(action.actionType) ?? 0,
    href: graphPath(ctx, "actions", action.slug),
  }));

  const newTableTrigger = <NewActionSheet projectId={project.id} />;

  const mainContent = (
    <ActionCatalogDataTable data={tableData} toolbar={<NewActionSheet projectId={project.id} />} />
  );

  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading catalog…</div>}>
      <GraphCatalogExplorer
        kind="action"
        requireSelection={false}
        showDefinition={false}
        newTableTrigger={newTableTrigger}
        mainHeader={{
          title: "Actions",
          description:
            "Global registry of typed capabilities. Actions can also be created from Nodes, Edges, Properties, and Instructions.",
        }}
        mainContent={mainContent}
      />
    </Suspense>
  );
}

function NewActionSheet({ projectId }: { projectId: string }) {
  return (
    <Sheet>
      <SheetTrigger render={<NewTableButton />}>New action</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New action contract</SheetTitle>
          <SheetDescription>
            Global action을 생성합니다. Local action은 node/edge/property 화면에서 생성하세요.
          </SheetDescription>
        </SheetHeader>
        <form action={defineScopedActionFormAction} className="space-y-4 px-6 pb-6">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="scopeKind" value="global" />
          <div className="space-y-2">
            <Label htmlFor="actionType">Action type</Label>
            <Input id="actionType" name="actionType" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="executor">Executor</Label>
            <Input id="executor" name="executor" defaultValue="Agent" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preconditions">Preconditions JSON</Label>
            <Textarea id="preconditions" name="preconditions" defaultValue="{}" />
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
