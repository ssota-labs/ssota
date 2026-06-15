import type { CreateNodeInput } from "@ssota/contracts/graph";
import { GraphError } from "../../domain/graph-errors.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort, GraphWritePort } from "../../ports/graph-read-port.js";
import { assertRoadmapCreateAllowed } from "./validate-roadmap.js";

export async function createNode(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    graphWrite: GraphWritePort;
  },
  input: CreateNodeInput,
) {
  const entry = deps.catalog.getNodeTypeEntry(input.nodeType);
  if (!entry) {
    throw new GraphError(
      "UNKNOWN_NODE_TYPE",
      `Node type '${input.nodeType}' is not in the catalog`,
    );
  }

  try {
    deps.catalog.validateNodeProperties(input.nodeType, input.properties);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid properties";
    throw new GraphError("VALIDATION_FAILED", message);
  }

  await assertRoadmapCreateAllowed(deps.graphRead, input);

  return deps.graphWrite.createNode(input);
}
