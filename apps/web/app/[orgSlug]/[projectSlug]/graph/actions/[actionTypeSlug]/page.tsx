import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  RunActionSheet,
  ViewFullLogButton,
} from "@/components/graph/action-table-actions";
import { ActionLogDataTable } from "@/components/graph/action-log-data-table";
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">{entry.label}</h1>
        <p className="text-xs text-muted-foreground">
          <Badge variant="secondary" className="mr-2">
            {formatActionScope(entry.scope)}
          </Badge>
          {entry.executor} · {entry.effects.length} effects · {logs.length} runs
        </p>
      </div>
      <ActionLogDataTable
        rows={tableRows}
        toolbar={toolbar}
        filterColumn="scope"
        emptyMessage={`${entry.actionType} 실행 기록이 아직 없습니다.`}
      />
    </div>
  );
}
