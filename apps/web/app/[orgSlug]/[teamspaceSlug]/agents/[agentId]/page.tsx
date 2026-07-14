import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { SkillIndex } from "@ssota/contracts";
import { MAIN_AGENT_ID } from "@ssota/contracts/agents";
import { AgentDetailWorkspace } from "@/components/console/agent-detail-workspace";
import { AgentsContentLoading } from "@/components/console/browse-content-loading";
import { loadAgentDefinitionsForUi } from "@/lib/console/load-agents-for-ui";
import { loadMainAgentDefinitionForUi } from "@/lib/console/load-main-agent-for-ui";
import {
  loadAgentSettingsConnections,
  loadAgentSettingsContext,
} from "@/lib/console/load-agent-settings-context";
import { legacyOrgTeamspacePath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { isWorkerAgentId } from "@/lib/console/agent-tool-catalog";
import type { AgentRunRow } from "@/lib/console/agent-run-format";
import { getAgentRunPort, getWorkerPort, getSkillPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

type AgentDetailParams = {
  orgSlug: string;
  teamspaceSlug: string;
  agentId: string;
};

export default function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<AgentDetailParams>;
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<AgentsContentLoading />}>
      <AgentDetailPageInner params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AgentDetailPageInner({
  params,
  searchParams,
}: {
  params: Promise<AgentDetailParams>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug, teamspaceSlug, agentId } = await params;
  const { tab } = await searchParams;
  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);

  const isMain = agentId === "main" || agentId === MAIN_AGENT_ID;
  const routeCtx = { orgSlug, teamspaceSlug };

  const [definitions, mainAgentDefinition, settingsContext, user] =
    await Promise.all([
      loadAgentDefinitionsForUi(project.id),
      loadMainAgentDefinitionForUi(project.id),
      loadAgentSettingsContext(
        project.id,
        org.id,
        legacyOrgTeamspacePath(routeCtx, "channels"),
      ),
      getCurrentUser(),
    ]);

  const definition = isMain
    ? mainAgentDefinition
    : (definitions.find((entry) => entry.id === agentId) ?? null);
  if (!definition) notFound();

  const connections =
    user != null
      ? await loadAgentSettingsConnections(project.id, org.id, user.id)
      : { user: [], org: [] };

  const [linkedWorkerIds, boundSkills, runPage] = await Promise.all([
    isMain
      ? Promise.resolve([] as string[])
      : getWorkerPort(project.id).listLinkedWorkerIds(definition.id),
    isMain
      ? Promise.resolve([] as SkillIndex[])
      : getSkillPort(project.id).then((port) =>
          port.listForAgentDefinition(definition.id),
        ),
    getAgentRunPort(project.id).listRuns(
      isMain ? { mainOnly: true } : { agentDefinitionId: definition.id },
    ),
  ]);

  const initialRuns: AgentRunRow[] = runPage.runs.map((run) => ({
    ...run,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
  }));

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <AgentDetailWorkspace
        teamspaceId={project.id}
        agentRouteId={isMain ? "main" : definition.id}
        definition={definition}
        settingsTarget={isMain ? "main" : "agent"}
        activeTab={tab === "logs" ? "logs" : "settings"}
        agentsHref={legacyOrgTeamspacePath(routeCtx, "agents")}
        settingsContext={{ ...settingsContext, connections }}
        linkedWorkerIds={linkedWorkerIds}
        boundSkillIds={boundSkills.map((skill: SkillIndex) => skill.id)}
        workers={definitions.filter((d) => isWorkerAgentId(d.id))}
        connectionsHref={legacyOrgTeamspacePath(routeCtx, "connections")}
        initialRuns={initialRuns}
        initialNextCursor={runPage.nextCursor}
      />
    </div>
  );
}
