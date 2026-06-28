import { createEdge, deleteEdge } from "@ssota/core";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { diffComposedOfTargets } from "@/lib/design-studio/composition";

export async function syncComposedOfEdges(input: {
  teamspaceId: string;
  sourceNodeId: string;
  targetNodeIds: string[];
}) {
  const deps = await getGraphDeps(input.teamspaceId);
  const existing = await deps.graphRead.traverseEdges({
    teamspaceId: input.teamspaceId,
    nodeId: input.sourceNodeId,
    direction: "outgoing",
    catalogKey: "composed_of",
  });

  const currentTargets = existing.map((edge) => edge.targetNodeId);
  const { toCreate, toDelete } = diffComposedOfTargets(
    currentTargets,
    input.targetNodeIds,
  );

  for (const targetNodeId of toDelete) {
    const edge = existing.find((item) => item.targetNodeId === targetNodeId);
    if (!edge) continue;
    await deleteEdge(deps.graphWrite, {
      teamspaceId: input.teamspaceId,
      edgeId: edge.id,
    });
  }

  for (const targetNodeId of toCreate) {
    await createEdge(deps, {
      teamspaceId: input.teamspaceId,
      catalogKey: "composed_of",
      sourceNodeId: input.sourceNodeId,
      targetNodeId,
    });
  }
}
