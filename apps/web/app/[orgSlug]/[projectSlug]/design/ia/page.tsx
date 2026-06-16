import { DesignIaWorkspace, type IaTreeNode } from "@/components/console/design-ia-workspace";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { createDefinesPageEdge } from "@/lib/graph/actions/create-defines-edge";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";
import { getGraphDeps } from "@/lib/graph/graph-deps";

async function buildIaTree(projectId: string): Promise<IaTreeNode[]> {
  const { graphRead } = getGraphDeps(projectId);
  const iaRoot = await ensureEvergreenSingleton(
    projectId,
    "information_architecture",
    "Site IA",
  );

  const definesEdges = await graphRead.traverseEdges({
    projectId,
    nodeId: iaRoot.id,
    direction: "outgoing",
    edgeType: "defines",
  });

  const children: IaTreeNode[] = [];
  for (const edge of definesEdges) {
    const page = await graphRead.getNode({
      projectId,
      nodeId: edge.targetNodeId,
    });
    if (page?.nodeType === "page") {
      children.push({
        id: page.id,
        label: page.title || page.properties.path?.toString() || "Page",
      });
    }
  }

  return [
    {
      id: iaRoot.id,
      label: iaRoot.title || "Site IA",
      children,
    },
  ];
}

export default async function DesignIaPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const revalidatePath = projectPath(ctx, "design", "ia");
  const nodes = await buildIaTree(project.id);
  const iaRoot = await ensureEvergreenSingleton(
    project.id,
    "information_architecture",
    "Site IA",
  );

  async function createPage() {
    "use server";
    const page = await createGraphNodeAction({
      projectId: project.id,
      nodeType: "page",
      title: `Page ${new Date().toISOString().slice(0, 10)}`,
      properties: { path: "/" },
      revalidatePaths: [revalidatePath],
    });
    await createDefinesPageEdge({
      projectId: project.id,
      iaRootId: iaRoot.id,
      pageId: page.id,
    });
  }

  return (
    <DesignIaWorkspace
      nodes={nodes}
      selectedPageContent={iaRoot.content ?? undefined}
      newLabel="New page"
      onCreatePage={createPage}
    />
  );
}
