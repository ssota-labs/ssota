import { SchedulesList } from "@/components/schedules/schedules-list";
import { resolveProject } from "@/lib/console/resolve-project";
import { loadWorkflowInstructionsForUi } from "@/lib/console/load-workflow-instructions-for-ui";
import { getOrCreateProjectAccount, getSchedulePort } from "@/lib/ports";

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);

  const account = await getOrCreateProjectAccount(project.id);
  const [schedules, instructions] = await Promise.all([
    getSchedulePort(project.id, account.id).list(),
    loadWorkflowInstructionsForUi(project.id),
  ]);

  return (
    <SchedulesList
      schedules={schedules}
      instructions={instructions.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
      }))}
      projectId={project.id}
      accountId={account.id}
    />
  );
}
