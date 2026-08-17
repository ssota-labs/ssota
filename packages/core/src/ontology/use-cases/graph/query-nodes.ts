import type { ListNodesByTypeInput } from "@ssota/contracts/graph";
import type { GraphReadPort } from "../../ports/graph-read-port.js";

export async function queryNodes(
  graph: GraphReadPort,
  params: ListNodesByTypeInput,
) {
  return graph.queryNodes(params);
}
