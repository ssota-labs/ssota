import type { CreateEdgeInput } from "@ssota/contracts/graph";
import { isKnownEdgeType } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GraphWritePort } from "../../ports/graph-write-port.js";
import { assertGraphNodeInProject } from "../../domain/graph-scope.js";

export async function createEdge(
  deps: { graphRead: GraphReadPort; graphWrite: GraphWritePort },
  input: CreateEdgeInput,
) {
  if (!isKnownEdgeType(input.edgeType)) {
    throw new GraphError(
      "UNKNOWN_EDGE_TYPE",
      `Edge type '${input.edgeType}' is not in the catalog`,
    );
  }

  const [source, target] = await Promise.all([
    deps.graphRead.getNodeById(input.sourceNodeId),
    deps.graphRead.getNodeById(input.targetNodeId),
  ]);

  assertGraphNodeInProject(input.projectId, source, "Source node");
  assertGraphNodeInProject(input.projectId, target, "Target node");

  return deps.graphWrite.createEdge(input);
}
