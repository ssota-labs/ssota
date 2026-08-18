import type { Effect } from "@ssota/contracts";
import type { Node } from "../../shared/domain/types.js";
import { ActionRejectedError } from "../../shared/domain/types.js";

export async function enforceProjectScope(
  teamspaceId: string,
  effects: Effect[],
  getNode: (nodeId: string) => Promise<Node | null>,
): Promise<void> {
  for (const effect of effects) {
    if (effect.kind === "update_node" || effect.kind === "delete_node") {
      await assertNodeInProjectScope(teamspaceId, await getNode(effect.nodeId));
      continue;
    }

    if (effect.kind === "create_edge") {
      await assertNodeInProjectScope(teamspaceId, await getNode(effect.edge.sourceNodeId));
      await assertNodeInProjectScope(teamspaceId, await getNode(effect.edge.targetNodeId));
    }
  }
}

export async function assertNodeInProjectScope(
  teamspaceId: string,
  node: Node | null,
): Promise<void> {
  if (!node) {
    throw new ActionRejectedError("PRECONDITION_FAILED", "Node not found");
  }

  if (node.teamspaceId !== teamspaceId) {
    throw new ActionRejectedError(
      "ORG_MISMATCH",
      `Node '${node.id}' belongs to a different project`,
    );
  }
}
