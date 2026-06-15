import type { GraphNode } from "./graph-types.js";
import { GraphError } from "./graph-errors.js";

export function assertGraphNodeInProject(
  projectId: string,
  node: GraphNode | null,
  label = "Node",
): asserts node is GraphNode {
  if (!node) {
    throw new GraphError("NOT_FOUND", `${label} not found`);
  }
  if (node.projectId !== projectId) {
    throw new GraphError(
      "PROJECT_MISMATCH",
      `${label} '${node.id}' belongs to a different project`,
    );
  }
}
