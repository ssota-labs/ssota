import type { DeleteEdgeInput } from "@ssota/contracts/graph";
import type { GraphWritePort } from "../../ports/graph-write-port.js";

export async function deleteEdge(
  graphWrite: GraphWritePort,
  input: DeleteEdgeInput,
) {
  return graphWrite.deleteEdge(input);
}
