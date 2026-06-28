import type { GraphNode } from "./graph-types.js";
import { GraphError } from "./graph-errors.js";

export function assertGraphNodeInTeamspace(
  teamspaceId: string,
  node: GraphNode | null,
  label = "Node",
): asserts node is GraphNode {
  if (!node) {
    throw new GraphError("NOT_FOUND", `${label} not found`);
  }
  if (node.teamspaceId !== null && node.teamspaceId !== teamspaceId) {
    throw new GraphError(
      "ORG_MISMATCH",
      `${label} '${node.id}' belongs to a different teamspace`,
    );
  }
}

/** @deprecated Use assertGraphNodeInTeamspace */
export function assertGraphNodeInProject(
  teamspaceId: string,
  node: GraphNode | null,
  label = "Node",
): asserts node is GraphNode {
  assertGraphNodeInTeamspace(teamspaceId, node, label);
}
