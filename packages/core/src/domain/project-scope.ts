import type { Effect } from "@ssota/contracts";
import type { Node } from "./types.js";
import { ActionRejectedError } from "./types.js";

export async function enforceProjectScope(
  projectId: string,
  effects: Effect[],
  getNode: (nodeId: string) => Promise<Node | null>,
): Promise<void> {
  for (const effect of effects) {
    if (effect.kind === "update_node" || effect.kind === "delete_node") {
      await assertNodeInProjectScope(projectId, await getNode(effect.nodeId));
      continue;
    }

    if (effect.kind === "create_edge") {
      await assertNodeInProjectScope(projectId, await getNode(effect.edge.sourceNodeId));
      await assertNodeInProjectScope(projectId, await getNode(effect.edge.targetNodeId));
    }
  }
}

export async function assertNodeInProjectScope(
  projectId: string,
  node: Node | null,
): Promise<void> {
  if (!node) {
    throw new ActionRejectedError("PRECONDITION_FAILED", "Node not found");
  }

  if (node.projectId !== projectId) {
    throw new ActionRejectedError(
      "PROJECT_MISMATCH",
      `Node '${node.id}' belongs to a different project`,
    );
  }
}
