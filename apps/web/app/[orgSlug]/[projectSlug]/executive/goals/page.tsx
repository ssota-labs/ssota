import { ExecutiveGoalsWorkspace } from "@/components/console/executive-goals-workspace";
import type { GraphListRow } from "@/components/console/graph-list-page";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { queryNodesByType } from "@/lib/graph/graph-deps";

function toRows(
  nodes: Awaited<ReturnType<typeof queryNodesByType>>,
  statusKey: string,
): GraphListRow[] {
  return nodes.map((node) => ({
    id: node.id,
    title: node.title || "Untitled",
    status:
      typeof node.properties[statusKey] === "string" ||
      typeof node.properties[statusKey] === "number"
        ? String(node.properties[statusKey])
        : undefined,
  }));
}

export default async function ExecutiveGoalsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const revalidatePath = projectPath(ctx, "executive", "goals");

  const [objectives, keyResults, kpis] = await Promise.all([
    queryNodesByType(project.id, "objective"),
    queryNodesByType(project.id, "key_result"),
    queryNodesByType(project.id, "kpi"),
  ]);

  async function createGoal(tab: "objective" | "key_result" | "kpi") {
    "use server";
    const labels = {
      objective: "Objective",
      key_result: "Key result",
      kpi: "KPI",
    } as const;
    await createGraphNodeAction({
      projectId: project.id,
      nodeType: tab,
      title: `${labels[tab]} ${new Date().toISOString().slice(0, 10)}`,
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <ExecutiveGoalsWorkspace
      objectives={toRows(objectives, "period")}
      keyResults={toRows(keyResults, "target")}
      kpis={toRows(kpis, "target")}
      newLabel="New"
      emptyTitle="No goals yet"
      emptyDescription="Create objectives, key results, or KPIs."
      onCreate={createGoal}
    />
  );
}
