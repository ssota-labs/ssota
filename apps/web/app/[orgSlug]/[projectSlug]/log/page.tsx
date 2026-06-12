import { ActionLogDataTable } from "@/components/graph/action-log-data-table";
import { getTranslations } from "@/lib/i18n/server";
import { formatActionScope } from "@/lib/graph/format-scope";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

export default async function LogPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { t } = await getTranslations();
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id); // project.id scopes action log
  const log = await ports.commit.getActionLog({ limit: 200 });

  const tableRows = log.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    actionType: entry.actionType,
    scope: formatActionScope(entry.metadata.scope ?? entry.input.scope),
    instruction: String(
      entry.metadata.instructionRunId ?? entry.metadata.instructionId ?? "-",
    ),
    outcome: entry.outcome,
    executorType: entry.executorType,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">{t("log.title")}</h1>
        <p className="text-xs text-muted-foreground">{t("log.description")}</p>
      </div>
      <ActionLogDataTable rows={tableRows} />
    </div>
  );
}
