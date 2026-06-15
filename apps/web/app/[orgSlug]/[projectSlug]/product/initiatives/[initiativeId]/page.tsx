import { OverviewHub } from "@/components/console/overview-hub";
import { initiativePath, projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { getRecentGraphActivity } from "@/lib/graph/loaders/get-recent-activity";
import { queryInitiativeScopedNodes } from "@/lib/graph/loaders/query-initiative-scoped";
import { getTaskPort } from "@/lib/ports";

export default async function InitiativeOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  const { orgSlug, projectSlug, initiativeId } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const { graphRead } = getGraphDeps(project.id);

  const initiative = await graphRead.getNode({
    projectId: project.id,
    nodeId: initiativeId,
  });

  const paired = await graphRead.traverseEdges({
    projectId: project.id,
    nodeId: initiativeId,
    direction: "outgoing",
    edgeType: "paired_with",
  });
  let releaseTitle = "—";
  if (paired[0]) {
    const release = await graphRead.getNode({
      projectId: project.id,
      nodeId: paired[0].targetNodeId,
    });
    releaseTitle = release?.title ?? "—";
  }

  const scopedNodes = await queryInitiativeScopedNodes(project.id, initiativeId);
  const tasks = await getTaskPort(project.id).queryTasks({ limit: 200 });
  const recentActivity = await getRecentGraphActivity(project.id, 5);

  return (
    <OverviewHub
      stats={[
        {
          id: "initiative",
          label: "Initiative",
          value: initiative?.title || "Untitled",
          description: "Current initiative scope",
        },
        {
          id: "release",
          label: "Release",
          value: releaseTitle,
          description: "Paired release version",
        },
        {
          id: "scoped",
          label: "Scoped nodes",
          value: scopedNodes.length,
          description: "Nodes linked to this initiative",
        },
        {
          id: "tasks",
          label: "Open tasks",
          value: tasks.filter((t) => t.status !== "done").length,
          description: "Project-wide open tasks",
        },
      ]}
      quickLinks={[
        {
          id: "prd",
          label: "PRD",
          description: "Planning document",
        },
        {
          id: "features",
          label: "Features",
          description: "Feature list",
        },
        {
          id: "tasks",
          label: "Build tasks",
          description: "Initiative tasks",
        },
      ]}
      recentActivity={recentActivity}
      nodesBasePath={projectPath(ctx, "nodes")}
    />
  );
}
