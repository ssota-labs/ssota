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
import { getActionPorts } from "@/lib/ports";

export default async function GraphActionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  await params;
  const ports = getActionPorts();
  const [actions, logs] = await Promise.all([
    ports.catalog.listActionCatalogEntries(),
    ports.commit.getActionLog({ limit: 100 }),
  ]);
  const runCounts = new Map<string, number>();
  for (const log of logs) runCounts.set(log.actionType, (runCounts.get(log.actionType) ?? 0) + 1);

  const tableData = actions.map((action) => ({
    actionType: action.actionType,
    scope: formatScope(action.scope),
    executor: action.executor,
    effectsCount: action.effects.length,
    runs: runCounts.get(action.actionType) ?? 0,
  }));

  const toolbar = <NewActionSheet />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Actions</h1>
        <p className="text-xs text-muted-foreground">
          Global registry of typed capabilities. Actions can also be created from Nodes, Edges,
          Properties, and Instructions.
        </p>
      </div>
      <ActionCatalogDataTable data={tableData} toolbar={toolbar} />
    </div>
  );
}

function formatScope(scope: { kind: string } & Record<string, unknown>) {
  if (scope.kind === "node_type") return `node:${scope.nodeType}`;
  if (scope.kind === "edge_type") return `edge:${scope.edgeType}`;
  if (scope.kind === "property") return `property:${scope.nodeType}.${scope.propertyKey}`;
  if (scope.kind === "instruction") return `instruction:${scope.title ?? scope.instructionId ?? "*"}`;
  return "global";
}

function NewActionSheet() {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" />}>New action</SheetTrigger>
      <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New action contract</SheetTitle>
          <SheetDescription>
            Global action을 생성합니다. Local action은 node/edge/property 화면에서 생성하세요.
          </SheetDescription>
        </SheetHeader>
        <form action={defineScopedActionFormAction} className="space-y-4 px-6 pb-6">
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
