import { ImpactQueueStatusSchema } from "@ssota/contracts";
import type { ImpactQueueStatus } from "@ssota/contracts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { ImpactQueueTable } from "@/components/impact/impact-queue-table";
import { ImpactSummaryChips } from "@/components/impact/impact-summary-chips";
import { PageHeader } from "@/components/studio/page-header";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getTranslations } from "@/lib/i18n/server";
import { serializeImpactQueueItem } from "@/lib/impact/serialize";
import { getActionPorts } from "@/lib/ports";

const summaryStatuses: ImpactQueueStatus[] = [
  "pending",
  "running",
  "failed",
  "dead",
];

async function loadStatusCounts(
  ports: ReturnType<typeof getActionPorts>,
): Promise<Record<ImpactQueueStatus, number>> {
  const results = await Promise.all(
    summaryStatuses.map(async (status) => {
      const items = await ports.impactQueue.queryImpactQueue({
        status,
        limit: 100,
      });
      return [status, items.length] as const;
    }),
  );

  return {
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    skipped: 0,
    ...Object.fromEntries(results),
  };
}

function parseStatusFilter(
  value: string | undefined,
): ImpactQueueStatus | undefined {
  if (!value) return undefined;
  const parsed = ImpactQueueStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export default async function ImpactPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { status: statusParam } = await searchParams;
  const { t } = await getTranslations();
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const activeStatus = parseStatusFilter(statusParam);

  const [items, counts] = await Promise.all([
    ports.impactQueue.queryImpactQueue({
      status: activeStatus,
      limit: 50,
    }),
    loadStatusCounts(ports),
  ]);

  const serializedItems = items.map(serializeImpactQueueItem);
  const baseHref = projectPath(ctx, "impact");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("impact.title")}
        description={t("impact.description")}
      />

      <ImpactSummaryChips
        baseHref={baseHref}
        activeStatus={activeStatus}
        counts={counts}
        labels={{
          all: t("impact.filterAll"),
          pending: t("impact.statusPending"),
          running: t("impact.statusRunning"),
          failed: t("impact.statusFailed"),
          dead: t("impact.statusDead"),
          succeeded: t("impact.statusSucceeded"),
          skipped: t("impact.statusSkipped"),
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("impact.queueTitle")}</CardTitle>
          <CardDescription>{t("impact.queueDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ImpactQueueTable
            items={serializedItems}
            isFiltered={Boolean(activeStatus)}
            labels={{
              created: t("impact.created"),
              workflow: t("impact.workflow"),
              route: t("impact.route"),
              status: t("impact.status"),
              attempts: t("impact.attempts"),
              worker: t("impact.worker"),
              runAt: t("impact.runAt"),
              detailTitle: t("impact.detailTitle"),
              detailDescription: t("impact.detailDescription"),
              provenance: t("impact.provenance"),
              runtime: t("impact.runtime"),
              data: t("impact.data"),
              empty: t("impact.empty"),
              emptyFiltered: t("impact.emptyFiltered"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
