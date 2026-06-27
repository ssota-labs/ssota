import type { CreateNodeInput } from "@ssota/contracts/graph";
import { normalizeNodeContentForWrite } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort, GraphWritePort } from "../../ports/graph-read-port.js";
import { assertRoadmapCreateAllowed } from "./validate-roadmap.js";

async function resolveNodeCatalog(
  catalog: CatalogReadPort,
  input: CreateNodeInput,
): Promise<{ id: string; key: string }> {
  if (input.nodeCatalogId) {
    const entry = await catalog.getNodeCatalogById(input.nodeCatalogId);
    if (!entry) {
      throw new GraphError(
        "UNKNOWN_NODE_TYPE",
        `Node catalog id '${input.nodeCatalogId}' not found`,
      );
    }
    return { id: entry.id, key: entry.key };
  }
  if (input.catalogKey) {
    const entry = await catalog.getNodeCatalogByKey(input.catalogKey);
    if (!entry) {
      throw new GraphError(
        "UNKNOWN_NODE_TYPE",
        `Node catalog key '${input.catalogKey}' not found`,
      );
    }
    return { id: entry.id, key: entry.key };
  }
  throw new GraphError(
    "VALIDATION_FAILED",
    "catalogKey or nodeCatalogId is required",
  );
}

export async function createNode(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    graphWrite: GraphWritePort;
  },
  input: CreateNodeInput,
) {
  const catalogRef = await resolveNodeCatalog(deps.catalog, input);

  let validatedProperties: Record<string, unknown>;
  try {
    validatedProperties = deps.catalog.validateNodeProperties(
      catalogRef.key,
      input.properties,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid properties";
    throw new GraphError("VALIDATION_FAILED", message);
  }

  if (validatedProperties.lifecycleStatus === undefined) {
    validatedProperties = { lifecycleStatus: "Draft", ...validatedProperties };
  }

  // Store markdown content as a BlockNote document so the app renders it richly.
  if (validatedProperties.content !== undefined) {
    validatedProperties = {
      ...validatedProperties,
      content: normalizeNodeContentForWrite(validatedProperties.content),
    };
  }

  await assertRoadmapCreateAllowed(deps.graphRead, {
    ...input,
    catalogKey: catalogRef.key,
  });

  return deps.graphWrite.createNode({
    teamspaceId: input.teamspaceId,
    nodeCatalogId: catalogRef.id,
    catalogKey: catalogRef.key,
    title: input.title,
    properties: validatedProperties,
    schemaVersion: input.schemaVersion ?? 1,
    initiativeId: input.initiativeId,
    releaseId: input.releaseId,
  });
}
