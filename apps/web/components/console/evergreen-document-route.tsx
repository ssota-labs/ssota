import { GraphDocumentPage } from "@/components/console/graph-document-page";
import { orgPath, type OrgRouteContext } from "@/lib/console/paths";
import { readLifecycleStatus, readNodeContent } from "@ssota/core";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";
import type { NodeType } from "@ssota/contracts";

type EvergreenDocumentRouteProps = {
  teamspaceId: string;
  ctx: OrgRouteContext;
  nodeType: NodeType;
  defaultTitle: string;
  revalidateSegments: string[];
  emptyDescription: string;
};

export async function EvergreenDocumentRoute({
  teamspaceId,
  ctx,
  nodeType,
  defaultTitle,
  revalidateSegments,
  emptyDescription,
}: EvergreenDocumentRouteProps) {
  const node = await ensureEvergreenSingleton(teamspaceId, nodeType, defaultTitle);
  const revalidatePath = orgPath(ctx, ...revalidateSegments);

  async function saveDocument(input: { title: string; content: string }) {
    "use server";
    await updateGraphNodeAction({
      teamspaceId,
      nodeId: node.id,
      title: input.title,
      content: input.content,
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <GraphDocumentPage
      title={node.title || defaultTitle}
      status={readLifecycleStatus(node.properties)}
      content={readNodeContent(node.properties) ?? ""}
      emptyDescription={emptyDescription}
      onSave={saveDocument}
    />
  );
}
