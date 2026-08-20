import { Suspense } from "react";
import { WorkflowCanvas, WorkflowLegend } from "@/components/workflows/workflow-canvas";
import { GraphContentLoading } from "@/components/console/browse-content-loading";
import { buildWiring, type WiringAgent } from "@/lib/workflows/build-wiring";
import { resolveOrg } from "@/lib/console/resolve-project";
import {
  getAgentDefinitionPort,
  getGraphPorts,
  getSchedulePort,
  getWorkerPort,
} from "@/lib/ports";

/**
 * Workflows 페이지 — 배선 캔버스 (Palantir Automate 대응).
 * 새 저장소를 만들지 않는다: 스케줄·에이전트·워커·액션이 이미 배선의 정본이다.
 */
export default function WorkflowsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<GraphContentLoading />}>
      <WorkflowsPageInner params={params} />
    </Suspense>
  );
}

async function WorkflowsPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);

  const agentPort = getAgentDefinitionPort(project.id);
  const [schedules, agentIndexes, workers, { actions }] = await Promise.all([
    getSchedulePort(project.id).list(),
    agentPort.listDefinitions(),
    getWorkerPort(project.id).listWorkers(),
    getGraphPorts(project.id),
  ]);
  const actionRows = await actions.listActionRows();

  // toolBundles는 index에 없다 — 배선의 "액션을 부를 수 있는가"가 여기 달려 있어 상세를 읽는다.
  const agents: WiringAgent[] = (
    await Promise.all(agentIndexes.map((a) => agentPort.getById(a.id)))
  )
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ id: a.id, name: a.name, toolBundles: a.toolBundles }));

  const model = buildWiring({
    schedules: schedules.map((s) => ({
      id: s.id,
      cronExpression: s.cronExpression,
      enabled: s.enabled,
      agentDefinitionId: s.agentDefinitionId,
      targetType: s.targetType,
    })),
    agents,
    workers,
    actions: actionRows,
  });

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="workflows-page">
      <header className="border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Workflows</h1>
        <p className="text-[11px] text-muted-foreground">
          How work is wired: what triggers agents, which functions compute edits, and which actions
          they may commit.
        </p>
      </header>
      <WorkflowLegend />
      {model.nodes.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Nothing wired yet. Define actions in Ontology, add agents, or schedule a run.
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <WorkflowCanvas model={model} orgSlug={orgSlug} teamspaceSlug={teamspaceSlug} />
        </div>
      )}
    </div>
  );
}
