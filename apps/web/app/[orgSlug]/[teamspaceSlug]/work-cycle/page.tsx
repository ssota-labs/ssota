import { Suspense } from "react";
import { WorkCycleWorkspace } from "@/components/console/work-cycle-workspace";
import { GraphContentLoading } from "@/components/console/browse-content-loading";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getGraphPorts } from "@/lib/ports";

export default function WorkCyclePage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<GraphContentLoading />}>
      <WorkCyclePageInner params={params} />
    </Suspense>
  );
}

async function WorkCyclePageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const { graphRead } = await getGraphPorts(project.id);

  const [cycleNodes, policyNodes] = await Promise.all([
    graphRead.queryNodes({
      teamspaceId: project.id,
      catalogKey: "work_cycle",
      limit: 100,
    }),
    graphRead.queryNodes({
      teamspaceId: project.id,
      catalogKey: "gate_policy",
      limit: 100,
    }),
  ]);

  return (
    <WorkCycleWorkspace
      teamspaceId={project.id}
      cycleNodes={cycleNodes.map((n) => ({
        id: n.id,
        title: n.title,
        properties: n.properties,
      }))}
      policyNodes={policyNodes.map((n) => ({
        id: n.id,
        title: n.title,
        properties: n.properties,
      }))}
    />
  );
}
