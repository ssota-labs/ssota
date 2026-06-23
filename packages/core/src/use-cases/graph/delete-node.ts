import type { DeleteNodeInput } from "@ssota/contracts/graph";
import type { GraphWritePort } from "../../ports/graph-write-port.js";

export async function deleteNode(
  graphWrite: GraphWritePort,
  input: DeleteNodeInput,
) {
  return graphWrite.deleteNode(input);
}
