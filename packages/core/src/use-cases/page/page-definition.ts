import {
  pageRuntimeDefinitionSchema,
  type PageRuntimeDefinition,
} from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GraphWritePort } from "../../ports/graph-write-port.js";
import type { GraphNode } from "../../domain/graph-types.js";
import { updateNode } from "../graph/index.js";

export interface PageDefinitionDeps {
  catalog: CatalogReadPort;
  graphRead: GraphReadPort;
  graphWrite: GraphWritePort;
}

export interface WritePageDefinitionInput {
  projectId: string;
  /** The `page` node that owns this definition (its dashboard surface). */
  nodeId: string;
  definition: PageRuntimeDefinition;
}

/**
 * Persist a PageRuntimeDefinition as a `page` node's `properties.definition`
 * (with `route_key` mirrored for lookup). Validated against the runtime
 * schema. This is the production persistence path the agent uses to author and
 * own its dashboard.
 */
export async function writePageDefinition(
  deps: PageDefinitionDeps,
  input: WritePageDefinitionInput,
): Promise<GraphNode> {
  const definition = pageRuntimeDefinitionSchema.parse(input.definition);

  const existing = await deps.graphRead.getNode({
    projectId: input.projectId,
    nodeId: input.nodeId,
  });
  if (!existing) {
    throw new GraphError("NOT_FOUND", `Page node '${input.nodeId}' not found`);
  }
  if (existing.catalogKey !== "page") {
    throw new GraphError(
      "VALIDATION_FAILED",
      `Node '${input.nodeId}' is not a page (catalogKey=${existing.catalogKey})`,
    );
  }

  return updateNode(deps, {
    projectId: input.projectId,
    nodeId: input.nodeId,
    properties: {
      ...existing.properties,
      definition,
      route_key: definition.routeKey,
    },
  });
}

export interface ReadPageDefinitionResult {
  nodeId: string;
  definition: PageRuntimeDefinition;
}

/** Find the `page` node whose definition has `routeKey`, and return it. */
export async function readPageDefinitionByRouteKey(
  graph: GraphReadPort,
  projectId: string,
  routeKey: string,
): Promise<ReadPageDefinitionResult | null> {
  const nodes = await graph.queryNodes({ projectId, catalogKey: "page" });
  for (const node of nodes) {
    const raw = node.properties.definition;
    if (!raw || typeof raw !== "object") continue;
    const parsed = pageRuntimeDefinitionSchema.safeParse(raw);
    if (parsed.success && parsed.data.routeKey === routeKey) {
      return { nodeId: node.id, definition: parsed.data };
    }
  }
  return null;
}
