import type { UpdateNodeInput } from "@ssota/contracts/graph";
import { requiresNodeContent, type NodeType } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GraphWritePort } from "../../ports/graph-write-port.js";
import { assertGraphNodeInProject } from "../../domain/graph-scope.js";

export async function updateNode(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    graphWrite: GraphWritePort;
  },
  input: UpdateNodeInput,
) {
  const existing = await deps.graphRead.getNode({
    projectId: input.projectId,
    nodeId: input.nodeId,
  });
  assertGraphNodeInProject(input.projectId, existing);

  const validatedProperties: Record<string, unknown> =
    input.properties !== undefined
      ? (() => {
          try {
            return deps.catalog.validateNodeProperties(
              existing.nodeType,
              input.properties,
            );
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Invalid properties";
            throw new GraphError("VALIDATION_FAILED", message);
          }
        })()
      : existing.properties;

  const nextContent =
    input.content !== undefined ? input.content : existing.content;

  if (
    requiresNodeContent(existing.nodeType as NodeType, validatedProperties) &&
    (nextContent === null || nextContent.trim() === "")
  ) {
    throw new GraphError(
      "VALIDATION_FAILED",
      `Node type '${existing.nodeType}' requires content`,
    );
  }

  if (input.content !== undefined) {
    try {
      deps.catalog.validateNodeContent(
        existing.nodeType,
        input.content,
        validatedProperties,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid content";
      throw new GraphError("VALIDATION_FAILED", message);
    }
  }

  return deps.graphWrite.updateNode(input);
}
