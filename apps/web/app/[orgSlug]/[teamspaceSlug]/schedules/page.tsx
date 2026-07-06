import { Suspense } from "react";
import { ScheduleHub } from "@/components/schedules/schedule-hub";
import { SchedulesContentLoading } from "@/components/console/browse-content-loading";
import { resolveOrg } from "@/lib/console/resolve-project";
import { loadScheduleHubContext } from "@/lib/schedules/load-schedule-hub-context";

export default function SchedulesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<SchedulesContentLoading />}>
      <SchedulesPageInner params={params} />
    </Suspense>
  );
}

async function SchedulesPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const hub = await loadScheduleHubContext(project.id);

  return (
    <div className="relative min-h-0 flex-1">
      <ScheduleHub
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        teamspaceId={hub.teamspaceId}
        accountId={hub.accountId}
        schedules={hub.schedules}
        syncWorkers={hub.syncWorkers}
        agents={hub.agents}
      />
    </div>
  );
}
