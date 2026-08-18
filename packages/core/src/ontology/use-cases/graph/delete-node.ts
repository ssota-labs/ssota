import type { DeleteNodeInput } from "@ssota/contracts/graph";
import type { GraphCommitPort } from "../../ports/action-port.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort, GraphWritePort } from "../../ports/graph-read-port.js";
import { commitSystemEdits } from "./system-actions.js";

/** [ACTION-01] runAction 경유. delete_node op는 부속 엣지까지 함께 지운다(어댑터 cascade). */
export async function deleteNode(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    /** @deprecated */
    graphWrite?: GraphWritePort;
    commit: GraphCommitPort;
  },
  input: DeleteNodeInput,
) {
  await commitSystemEdits(deps, {
    key: "graph.delete_node",
    teamspaceId: input.teamspaceId,
    edits: { edits: [{ op: "delete_node", node: { id: input.nodeId } }] },
    lockNodeId: input.nodeId,
  });
}
