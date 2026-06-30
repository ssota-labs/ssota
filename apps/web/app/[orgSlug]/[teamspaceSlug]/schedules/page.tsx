import { SchedulesList } from "@/components/schedules/schedules-list";
import { resolveOrg } from "@/lib/console/resolve-project";
import { loadAgentDefinitionsForUi } from "@/lib/console/load-agents-for-ui";
import { getOrCreateProjectAccount, getSchedulePort } from "@/lib/ports";

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);

  const account = await getOrCreateProjectAccount(project.id);
  const [schedules, instructions] = await Promise.all([
    getSchedulePort(project.id, account.id).list(),
    loadAgentDefinitionsForUi(project.id),
  ]);

  return (
    <div className="relative min-h-0 flex-1">
      <SchedulesList
        schedules={schedules.map((schedule) => ({
          id: schedule.id,
          agentDefinitionId: schedule.agentDefinitionId,
          targetType: schedule.targetType,
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone,
          enabled: schedule.enabled,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
        }))}
        instructions={instructions.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          key: i.key,
        }))}
        teamspaceId={project.id}
        accountId={account.id}
      />
    </div>
  );
}
