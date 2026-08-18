import type { DeleteEdgeInput } from "@ssota/contracts/graph";
import type { GraphCommitPort } from "../../ports/action-port.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort, GraphWritePort } from "../../ports/graph-read-port.js";
import { GraphError } from "../../domain/graph-errors.js";
import { commitSystemEdits } from "./system-actions.js";

/** [ACTION-01] runAction 경유. 옛 (graphWrite, input) 시그니처는 deps 객체로 바뀌었다. */
export async function deleteEdge(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    /** @deprecated */
    graphWrite?: GraphWritePort;
    commit: GraphCommitPort;
  },
  input: DeleteEdgeInput,
) {
  const edge = await deps.graphRead.getEdgeById(input.edgeId);
  if (!edge) throw new GraphError("NOT_FOUND", `Edge ${input.edgeId} not found`);
  await commitSystemEdits(deps, {
    key: "graph.delete_edge",
    teamspaceId: input.teamspaceId,
    edits: { edits: [{ op: "delete_edge", edgeId: input.edgeId }] },
    lockNodeId: edge.sourceNodeId,
  });
}
