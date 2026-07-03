import { Suspense } from "react";
import { AgentsWorkspace } from "@/components/console/agents-workspace";
import { AgentsContentLoading } from "@/components/console/browse-content-loading";
import { loadAgentGroupsForUi } from "@/lib/console/load-agents-for-ui";
import { loadMainAgentDefinitionForUi } from "@/lib/console/load-main-agent-for-ui";
import {
  loadAgentSettingsConnections,
  loadAgentSettingsContext,
} from "@/lib/console/load-agent-settings-context";
import { legacyOrgTeamspacePath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getScriptToolPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default function AgentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<AgentsContentLoading />}>
      <AgentsPageInner params={params} />
    </Suspense>
  );
}

async function AgentsPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);
  const [groups, mainAgentDefinition, settingsContext, user] = await Promise.all([
    loadAgentGroupsForUi(project.id),
    loadMainAgentDefinitionForUi(project.id),
    loadAgentSettingsContext(
      project.id,
      legacyOrgTeamspacePath({ orgSlug, teamspaceSlug }, "channels"),
    ),
    getCurrentUser(),
  ]);

  const connections =
    user != null
      ? await loadAgentSettingsConnections(project.id, org.id, user.id)
      : { user: [], org: [] };

  const definitions = groups.flatMap((g) => g.items);
  const scriptToolPort = getScriptToolPort(project.id);
  const scriptToolLinks: Record<string, string[]> = {};
  await Promise.all(
    definitions.map(async (definition) => {
      scriptToolLinks[definition.id] =
        await scriptToolPort.listLinkedScriptToolIds(definition.id);
    }),
  );

  return (
    <div className="relative min-h-0 flex-1">
      <AgentsWorkspace
        teamspaceId={project.id}
        mainAgentDefinition={mainAgentDefinition}
        groups={groups}
        settingsContext={{
          ...settingsContext,
          connections,
        }}
        scriptToolLinks={scriptToolLinks}
        skillsHref={legacyOrgTeamspacePath({ orgSlug, teamspaceSlug }, "skills")}
      />
    </div>
  );
}
