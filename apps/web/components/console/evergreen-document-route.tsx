import { GraphDocumentPage } from "@/components/console/graph-document-page";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";
import type { NodeType } from "@ssota/contracts";

type EvergreenDocumentRouteProps = {
  projectId: string;
  ctx: ProjectRouteContext;
  nodeType: NodeType;
  defaultTitle: string;
  revalidateSegments: string[];
  emptyDescription: string;
};

export async function EvergreenDocumentRoute({
  projectId,
  ctx,
  nodeType,
  defaultTitle,
  revalidateSegments,
  emptyDescription,
}: EvergreenDocumentRouteProps) {
  const node = await ensureEvergreenSingleton(projectId, nodeType, defaultTitle);
  const revalidatePath = projectPath(ctx, ...revalidateSegments);

  async function saveDocument(input: { title: string; content: string }) {
    "use server";
    await updateGraphNodeAction({
      projectId,
      nodeId: node.id,
      title: input.title,
      content: input.content,
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <GraphDocumentPage
      title={node.title || defaultTitle}
      status={node.lifecycleStatus}
      content={node.content ?? ""}
      editLabel="Edit"
      emptyDescription={emptyDescription}
      onSave={saveDocument}
    />
  );
}
