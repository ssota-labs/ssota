import { InitiativesWorkspace } from "@/components/console/initiatives-workspace";
import type { GraphListRow } from "@/components/console/graph-list-page";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { createInitiativeBundleAction } from "@/lib/graph/actions/graph-mutations";
import { getGraphDeps } from "@/lib/graph/graph-deps";

async function buildInitiativeRows(projectId: string): Promise<GraphListRow[]> {
  const { graphRead } = getGraphDeps(projectId);
  const initiatives = await graphRead.queryNodes({
    projectId,
    catalogKey: "initiative",
    limit: 200,
  });

  const rows: GraphListRow[] = [];
  for (const initiative of initiatives) {
    const paired = await graphRead.traverseEdges({
      projectId,
      nodeId: initiative.id,
      direction: "outgoing",
      catalogKey: "paired_with",
    });
    let releaseTitle: string | undefined;
    if (paired[0]) {
      const release = await graphRead.getNode({
        projectId,
        nodeId: paired[0].targetNodeId,
      });
      releaseTitle = release?.title;
    }
    rows.push({
      id: initiative.id,
      title: initiative.title || "Untitled",
      status: releaseTitle,
    });
  }
  return rows.sort((a, b) => a.title.localeCompare(b.title));
}

export default async function ProductInitiativesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const rows = await buildInitiativeRows(project.id);
  const basePath = projectPath(ctx, "initiatives");

  async function createInitiative(input: { title: string; releaseVersion: string }) {
    "use server";
    await createInitiativeBundleAction({
      projectId: project.id,
      initiativeTitle: input.title,
      releaseVersion: input.releaseVersion,
      ctx,
      redirectToPrd: false,
    });
  }

  return (
    <InitiativesWorkspace
      rows={rows}
      initiativeBasePath={basePath}
      createInitiative={createInitiative}
    />
  );
}
