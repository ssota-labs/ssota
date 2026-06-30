import { AgentsWorkspace } from "@/components/console/agents-workspace";
import { loadAgentGroupsForUi } from "@/lib/console/load-agents-for-ui";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const groups = await loadAgentGroupsForUi(project.id);

  return (
    <div className="relative min-h-0 flex-1">
      <AgentsWorkspace
        teamspaceId={project.id}
        groups={groups}
        skillsHref={orgPath({ orgSlug, teamspaceSlug }, "skills")}
      />
    </div>
  );
}
