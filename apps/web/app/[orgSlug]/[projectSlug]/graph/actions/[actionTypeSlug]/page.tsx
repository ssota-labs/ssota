import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ssota/ui/components/ui/sheet";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { defineScopedActionFormAction } from "@/app/actions";
import {
  RunActionSheet,
  ViewFullLogButton,
} from "@/components/graph/action-table-actions";
import { ActionLogDataTable } from "@/components/graph/action-log-data-table";
import { GraphCatalogExplorer } from "@/components/graph/graph-catalog-explorer";
import { NewTableButton } from "@/components/graph/table-catalog-panel";
import { projectPath } from "@/lib/console/paths";
import { formatActionScope } from "@/lib/graph/format-scope";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function GraphActionDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; actionTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug, actionTypeSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const slug = decodeURIComponent(actionTypeSlug);
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const entry = await ports.catalog.getActionCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const logs = await ports.commit.getActionLog({
    actionType: entry.actionType,
    limit: 200,
  });

  const tableRows = logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    actionType: log.actionType,
    scope: formatActionScope(log.metadata.scope ?? log.input.scope),
    instruction: String(
      log.metadata.instructionRunId ?? log.metadata.instructionId ?? "-",
    ),
    outcome: log.outcome,
    executorType: log.executorType,
  }));

  const toolbar = (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <RunActionSheet actionType={entry.actionType} projectId={project.id} />
      <ViewFullLogButton href={projectPath(ctx, "log")} />
      <Button
        render={<Link href={`/studio/actions/${encodeURIComponent(entry.actionType)}/edit`} />}
        variant="outline"
        size="sm"
        nativeButton={false}
      >
        Edit contract
      </Button>
    </div>
  );

  const mainContent = (
    <ActionLogDataTable
      rows={tableRows}
      toolbar={toolbar}
      filterColumn="scope"
      emptyMessage={`${entry.actionType} 실행 기록이 아직 없습니다.`}
    />
  );

  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading catalog…</div>}>
      <GraphCatalogExplorer
        kind="action"
        showDefinition={false}
        newTableTrigger={<NewActionSheet projectId={project.id} />}
        mainHeader={{
          title: entry.label,
          description: `${formatActionScope(entry.scope)} · ${entry.executor} · ${entry.effects.length} effects · ${logs.length} runs`,
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
