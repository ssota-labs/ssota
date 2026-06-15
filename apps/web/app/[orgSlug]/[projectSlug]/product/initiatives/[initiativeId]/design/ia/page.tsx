import { DesignIaWorkspace, type IaTreeNode } from "@/components/console/design-ia-workspace";
import { initiativePath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { createDefinesPageEdge } from "@/lib/graph/actions/create-defines-edge";
import { ensureInitiativeScopedNode } from "@/lib/graph/loaders/ensure-initiative-scoped-node";
import { getGraphDeps } from "@/lib/graph/graph-deps";

async function buildScopedIaTree(
  projectId: string,
  initiativeId: string,
): Promise<{ nodes: IaTreeNode[]; iaRootId: string; iaContent?: string }> {
  const { graphRead } = getGraphDeps(projectId);
  const iaRoot = await ensureInitiativeScopedNode(
    projectId,
    initiativeId,
    "information_architecture",
    "Initiative IA",
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

  return {
    nodes: [
      {
        id: iaRoot.id,
        label: iaRoot.title || "Initiative IA",
        children,
      },
    ],
    iaRootId: iaRoot.id,
    iaContent: iaRoot.content ?? undefined,
  };
}

export default async function InitiativeDesignIaPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  const { orgSlug, projectSlug, initiativeId } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const revalidatePath = initiativePath(ctx, initiativeId, "design", "ia");
  const { nodes, iaRootId, iaContent } = await buildScopedIaTree(
    project.id,
    initiativeId,
  );

  async function createPage() {
    "use server";
    const page = await createGraphNodeAction({
      projectId: project.id,
      nodeType: "page",
      title: `Page ${new Date().toISOString().slice(0, 10)}`,
      properties: { path: "/" },
      initiativeId,
      revalidatePaths: [revalidatePath],
    });
    await createDefinesPageEdge({
      projectId: project.id,
      iaRootId,
      pageId: page.id,
    });
  }

  return (
    <DesignIaWorkspace
      nodes={nodes}
      selectedPageContent={iaContent}
      newLabel="New page"
      onCreatePage={createPage}
    />
  );
}
