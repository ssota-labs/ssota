import type { UpdateNodeInput } from "@ssota/contracts/graph";
import { normalizeNodeContentForWrite } from "@ssota/contracts";
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

  if (input.properties !== undefined) {
    try {
      deps.catalog.validateNodeProperties(existing.catalogKey, input.properties);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid properties";
      throw new GraphError("VALIDATION_FAILED", message);
    }
  }

  // Store markdown content as a BlockNote document so the app renders it richly.
  const persisted =
    input.properties !== undefined && input.properties.content !== undefined
      ? {
          ...input,
          properties: {
            ...input.properties,
            content: normalizeNodeContentForWrite(input.properties.content),
          },
        }
      : input;

  return deps.graphWrite.updateNode(persisted);
}
