import { OverviewHub } from "@/components/console/overview-hub";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { buildWorkflowLensSummary } from "@/lib/graph/loaders/build-workflow-lens";
import { getRecentGraphActivity } from "@/lib/graph/loaders/get-recent-activity";
import { queryNodesByType } from "@/lib/graph/graph-deps";
import { getTaskPort } from "@/lib/ports";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const ctx = { orgSlug, teamspaceSlug };
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);

  const [tasks, initiatives, recentActivity, workflowSummary] = await Promise.all([
    getTaskPort(project.id).queryTasks({ limit: 200 }),
    queryNodesByType(project.id, "initiative"),
    getRecentGraphActivity(project.id),
    buildWorkflowLensSummary(ctx, project.id),
  ]);

  const openTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );

  return (
    <OverviewHub
      stats={[
        {
          id: "open-tasks",
          label: "Open tasks",
          value: openTasks.length,
          description: "Across the project workspace",
        },
        {
          id: "initiatives",
          label: "Initiatives",
          value: initiatives.length,
          description: "In-flight product initiatives",
        },
        {
          id: "hypotheses",
          label: "Hypotheses",
          value: (await queryNodesByType(project.id, "hypothesis")).length,
          description: "Research hypotheses tracked",
        },
        {
          id: "recent",
          label: "Recent updates",
          value: recentActivity.length,
          description: "Latest graph node changes",
        },
      ]}
      quickLinks={[
        { id: "tasks", label: "Tasks", description: "Team work queue" },
        {
          id: "workflow",
          label: "Workflow Map",
          description: "Full project graph",
        },
        {
          id: "initiatives",
          label: "Initiatives",
          description: "Product initiative list",
        },
      ]}
      recentActivity={recentActivity}
      nodesBasePath={orgPath(ctx, "n")}
      workflowMapPath={orgPath(ctx, "workflow", "map")}
      workflowSummary={workflowSummary}
    />
  );
}
