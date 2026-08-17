import type { TraverseEdgesInput } from "@ssota/contracts/graph";
import type { GraphReadPort } from "../../ports/graph-read-port.js";

export async function traverseEdges(
  graph: GraphReadPort,
  params: TraverseEdgesInput,
) {
  return graph.traverseEdges(params);
}
