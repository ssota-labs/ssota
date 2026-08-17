import type { GetNodeInput } from "@ssota/contracts/graph";
import type { GraphReadPort } from "../../ports/graph-read-port.js";

export async function getNode(graph: GraphReadPort, params: GetNodeInput) {
  return graph.getNode(params);
}
