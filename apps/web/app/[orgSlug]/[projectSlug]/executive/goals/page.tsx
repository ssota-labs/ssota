import { GoalsCommandCenter } from "@/components/console/goals/goals-command-center";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { createObjectiveBundleAction } from "@/lib/graph/actions/create-objective-bundle";
import { loadGoalsDashboard } from "@/lib/graph/loaders/load-goals-dashboard";

export default async function ExecutiveGoalsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const revalidatePath = projectPath(ctx, "executive", "goals");
  const dashboard = await loadGoalsDashboard(project.id);

  async function createObjective(input: {
    title: string;
    period?: string;
    keyResultTitle?: string;
  }) {
    "use server";
    await createObjectiveBundleAction({
      projectId: project.id,
      title: input.title,
      period: input.period,
      keyResults: input.keyResultTitle
        ? [{ title: input.keyResultTitle }]
        : undefined,
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <GoalsCommandCenter
      dashboard={dashboard}
      nodesBasePath={projectPath(ctx, "nodes")}
      roadmapHref={projectPath(ctx, "executive", "roadmap")}
      onCreateObjective={createObjective}
    />
  );
}
