import { createEdge } from "@ssota/core";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { getGraphDeps } from "@/lib/graph/graph-deps";

export async function createDefinesPageEdge(input: {
  projectId: string;
  iaRootId: string;
  pageId: string;
}) {
  const deps = getGraphDeps(input.projectId);
  return createEdge(deps, {
    projectId: input.projectId,
    catalogKey: "defines",
    sourceNodeId: input.iaRootId,
    targetNodeId: input.pageId,
  });
}
