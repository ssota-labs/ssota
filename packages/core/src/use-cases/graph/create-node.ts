import type { CreateNodeInput } from "@ssota/contracts/graph";
import { requiresNodeContent, type NodeType } from "@ssota/contracts";
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

  let validatedProperties: Record<string, unknown>;
  try {
    validatedProperties = deps.catalog.validateNodeProperties(
      input.nodeType,
      input.properties,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid properties";
    throw new GraphError("VALIDATION_FAILED", message);
  }

  const content = input.content ?? null;
  if (
    requiresNodeContent(input.nodeType as NodeType, validatedProperties) &&
    (content === null || content.trim() === "")
  ) {
    throw new GraphError(
      "VALIDATION_FAILED",
      `Node type '${input.nodeType}' requires content`,
    );
  }

  if (content !== null && content !== undefined) {
    try {
      deps.catalog.validateNodeContent(
        input.nodeType,
        content,
        validatedProperties,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid content";
      throw new GraphError("VALIDATION_FAILED", message);
    }
  }

  await assertRoadmapCreateAllowed(deps.graphRead, input);

  return deps.graphWrite.createNode(input);
}
