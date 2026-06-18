import type { NodeType } from "@ssota/contracts";
import type { GraphListRow } from "@/components/console/graph-list-page";
import { GraphDocumentPage } from "@/components/console/graph-document-page";
import { GraphListPage } from "@/components/console/graph-list-page";
import { initiativePath, type ProjectRouteContext } from "@/lib/console/paths";
import { readLifecycleStatus, readNodeContent } from "@ssota/core";
import { createGraphNodeAction, updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { ensureInitiativeScopedNode } from "@/lib/graph/loaders/ensure-initiative-scoped-node";
import { queryInitiativeScopedNodes } from "@/lib/graph/loaders/query-initiative-scoped";

export async function ScopedListRoute({
  projectId,
  initiativeId,
  ctx,
  nodeType,
  pathSuffix,
  defaultTitle,
  newLabel,
  emptyTitle,
  emptyDescription,
}: {
  projectId: string;
  initiativeId: string;
  ctx: ProjectRouteContext;
  nodeType: NodeType;
  pathSuffix: string[];
  defaultTitle: string;
  newLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const nodes = await queryInitiativeScopedNodes(projectId, initiativeId, nodeType);
  const revalidatePath = initiativePath(ctx, initiativeId, ...pathSuffix);

  const rows: GraphListRow[] = nodes.map((node) => ({
    id: node.id,
    title: node.title || "Untitled",
    status:
      typeof node.properties.status === "string" ? node.properties.status : undefined,
  }));

  async function createItem() {
    "use server";
    await createGraphNodeAction({
      projectId,
      catalogKey: nodeType,
      title: `${defaultTitle} ${new Date().toISOString().slice(0, 10)}`,
      initiativeId,
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <GraphListPage
      columns={[
        { accessorKey: "title", header: "Title" },
        { accessorKey: "status", header: "Status" },
      ]}
      data={rows}
      newLabel={newLabel}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onCreate={createItem}
    />
  );
}

export async function ScopedDocumentRoute({
  projectId,
  initiativeId,
  ctx,
  nodeType,
  pathSuffix,
  defaultTitle,
  emptyDescription,
}: {
  projectId: string;
  initiativeId: string;
  ctx: ProjectRouteContext;
  nodeType: NodeType;
  pathSuffix: string[];
  defaultTitle: string;
  emptyDescription: string;
}) {
  const node = await ensureInitiativeScopedNode(
    projectId,
    initiativeId,
    nodeType,
    defaultTitle,
  );
  const revalidatePath = initiativePath(ctx, initiativeId, ...pathSuffix);

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
      status={readLifecycleStatus(node.properties)}
      content={readNodeContent(node.properties) ?? ""}
      emptyDescription={emptyDescription}
      onSave={saveDocument}
    />
  );
}
