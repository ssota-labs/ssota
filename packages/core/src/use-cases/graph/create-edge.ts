import type { CreateEdgeInput } from "@ssota/contracts/graph";
import { GraphError } from "../../domain/graph-errors.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GraphWritePort } from "../../ports/graph-write-port.js";

async function resolveEdgeCatalog(
  catalog: CatalogReadPort,
  input: CreateEdgeInput,
): Promise<{ id: string; key: string }> {
  if (input.edgeCatalogId) {
    const entry = await catalog.getEdgeCatalogById(input.edgeCatalogId);
    if (!entry) {
      throw new GraphError(
        "UNKNOWN_EDGE_TYPE",
        `Edge catalog id '${input.edgeCatalogId}' not found`,
      );
    }
    return { id: entry.id, key: entry.key };
  }
  if (input.catalogKey) {
    const entry = await catalog.getEdgeCatalogByKey(input.catalogKey);
    if (!entry) {
      throw new GraphError(
        "UNKNOWN_EDGE_TYPE",
        `Edge catalog key '${input.catalogKey}' not found`,
      );
    }
    return { id: entry.id, key: entry.key };
  }
  throw new GraphError(
    "VALIDATION_FAILED",
    "catalogKey or edgeCatalogId is required",
  );
}

export async function createEdge(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    graphWrite: GraphWritePort;
  },
  input: CreateEdgeInput,
) {
  const catalogRef = await resolveEdgeCatalog(deps.catalog, input);

  const [source, target] = await Promise.all([
    deps.graphRead.getNodeById(input.sourceNodeId),
    deps.graphRead.getNodeById(input.targetNodeId),
  ]);

  if (!source) {
    throw new GraphError("NOT_FOUND", "Source node not found");
  }
  if (!target) {
    throw new GraphError("NOT_FOUND", "Target node not found");
  }

  let validatedProperties: Record<string, unknown>;
  try {
    validatedProperties = deps.catalog.validateEdgeProperties(
      catalogRef.key,
      input.properties,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid properties";
    throw new GraphError("VALIDATION_FAILED", message);
  }

  return deps.graphWrite.createEdge({
    teamspaceId: input.teamspaceId,
    edgeCatalogId: catalogRef.id,
    catalogKey: catalogRef.key,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    properties: validatedProperties,
  });
}
