import { createEdge } from "@ssota/core";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { getGraphDeps } from "@/lib/graph/graph-deps";

export async function createDefinesPageEdge(input: {
  teamspaceId: string;
  iaRootId: string;
  pageId: string;
}) {
  const deps = getGraphDeps(input.teamspaceId);
  return createEdge(deps, {
    teamspaceId: input.teamspaceId,
    catalogKey: "defines",
    sourceNodeId: input.iaRootId,
    targetNodeId: input.pageId,
  });
}
