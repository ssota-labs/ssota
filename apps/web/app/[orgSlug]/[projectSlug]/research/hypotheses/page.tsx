import { HypothesesWorkspace } from "@/components/console/hypotheses-workspace";
import type { GraphListRow } from "@/components/console/graph-list-page";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import {
  createGraphNodeAction,
  createInitiativeFromHypothesisAction,
} from "@/lib/graph/actions/graph-mutations";
import { queryNodesByType } from "@/lib/graph/graph-deps";

function toRows(
  nodes: Awaited<ReturnType<typeof queryNodesByType>>,
): GraphListRow[] {
  return nodes.map((node) => ({
    id: node.id,
    title: node.title || "Untitled",
    status:
      typeof node.properties.status === "string"
        ? node.properties.status
        : "draft",
  }));
}

export default async function ResearchHypothesesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const nodes = await queryNodesByType(project.id, "hypothesis");
  const revalidatePath = projectPath(ctx, "research", "hypotheses");

  async function createHypothesis() {
    "use server";
    await createGraphNodeAction({
      projectId: project.id,
      catalogKey: "hypothesis",
      title: `Hypothesis ${new Date().toISOString().slice(0, 10)}`,
      properties: { status: "draft" },
      revalidatePaths: [revalidatePath],
    });
  }

  async function createInitiative(hypothesisId: string, title: string) {
    "use server";
    await createInitiativeFromHypothesisAction({
      projectId: project.id,
      hypothesisId,
      initiativeTitle: title || "New initiative",
      releaseVersion: "0.1.0",
      ctx,
    });
  }

  return (
    <HypothesesWorkspace
      rows={toRows(nodes)}
      newLabel="New hypothesis"
      emptyTitle="No hypotheses yet"
      emptyDescription="Create a hypothesis to validate before starting an initiative."
      createHypothesis={createHypothesis}
      createInitiative={createInitiative}
    />
  );
}
