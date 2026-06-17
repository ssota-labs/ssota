import { createEdge, deleteEdge } from "@ssota/core";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { diffComposedOfTargets } from "@/lib/design-studio/composition";

export async function syncComposedOfEdges(input: {
  projectId: string;
  sourceNodeId: string;
  targetNodeIds: string[];
}) {
  const deps = getGraphDeps(input.projectId);
  const existing = await deps.graphRead.traverseEdges({
    projectId: input.projectId,
    nodeId: input.sourceNodeId,
    direction: "outgoing",
    edgeType: "composed_of",
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
      projectId: input.projectId,
      edgeId: edge.id,
    });
  }

  for (const targetNodeId of toCreate) {
    await createEdge(deps, {
      projectId: input.projectId,
      edgeType: "composed_of",
      sourceNodeId: input.sourceNodeId,
      targetNodeId,
    });
  }
}
