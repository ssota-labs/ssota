import type { CreateEdgeInput } from "@ssota/contracts/graph";
import { GraphError } from "../../domain/graph-errors.js";
import type { GatePolicySource } from "../../gate/evaluate-gate-policies.js";
import type { GraphCommitPort } from "../../ports/action-port.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import { commitSystemEdits } from "./system-actions.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GraphWritePort } from "../../ports/graph-write-port.js";

async function resolveEdgeCatalog(
  catalog: CatalogReadPort,
  input: CreateEdgeInput,
): Promise<{ id: string; key: string; domainCatalogIds: string[]; rangeCatalogIds: string[] }> {
  const pick = (entry: { id: string; key: string; domainCatalogIds: string[]; rangeCatalogIds: string[] }) => ({
    id: entry.id,
    key: entry.key,
    domainCatalogIds: entry.domainCatalogIds,
    rangeCatalogIds: entry.rangeCatalogIds,
  });
  if (input.edgeCatalogId) {
    const entry = await catalog.getEdgeCatalogById(input.edgeCatalogId);
    if (!entry) {
      throw new GraphError(
        "UNKNOWN_EDGE_TYPE",
        `Edge catalog id '${input.edgeCatalogId}' not found`,
      );
    }
    return pick(entry);
  }
  if (input.catalogKey) {
    const entry = await catalog.getEdgeCatalogByKey(input.catalogKey);
    if (!entry) {
      throw new GraphError(
        "UNKNOWN_EDGE_TYPE",
        `Edge catalog key '${input.catalogKey}' not found`,
      );
    }
    return pick(entry);
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
    /** @deprecated runAction 경유로 커밋한다 */
    graphWrite?: GraphWritePort;
    commit: GraphCommitPort;
    gatePolicies?: GatePolicySource;
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

  // [GRAPH-05] edge domain/range — 카탈로그가 비어 있으면(빈 배열) 무제약, 아니면 강제.
  if (
    catalogRef.domainCatalogIds.length > 0 &&
    !catalogRef.domainCatalogIds.includes(source.nodeCatalogId)
  ) {
    throw new GraphError(
      "VALIDATION_FAILED",
      `Edge '${catalogRef.key}' domain violation: source type '${source.catalogKey}' is not allowed`,
    );
  }
  if (
    catalogRef.rangeCatalogIds.length > 0 &&
    !catalogRef.rangeCatalogIds.includes(target.nodeCatalogId)
  ) {
    throw new GraphError(
      "VALIDATION_FAILED",
      `Edge '${catalogRef.key}' range violation: target type '${target.catalogKey}' is not allowed`,
    );
  }

  let validatedProperties: Record<string, unknown>;
  try {
    validatedProperties = await deps.catalog.validateEdgeProperties(
      catalogRef.key,
      input.properties,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid properties";
    throw new GraphError("VALIDATION_FAILED", message);
  }

  // [ACTION-01] runAction 경유. (domain/range·properties 검증은 applyEdits가 트랜잭션 안에서 다시 한다 —
  // 위 사전 검증은 락 전에 빠른 실패를 위한 것.)
  const out = await commitSystemEdits(deps, {
    key: "graph.create_edge",
    teamspaceId: input.teamspaceId,
    edits: { edits: [{
      op: "create_edge", ref: "edge", catalogKey: catalogRef.key,
      from: { id: input.sourceNodeId }, to: { id: input.targetNodeId }, properties: validatedProperties,
    }] },
    lockNodeId: input.sourceNodeId,
  });
  const edgeId = out.result.refs.edge;
  if (!edgeId) throw new GraphError("PRECONDITION_FAILED", "create_edge did not yield an edge id");
  const edge = await deps.graphRead.getEdgeById(edgeId);
  if (!edge) throw new GraphError("NOT_FOUND", `created edge ${edgeId} not readable`);
  return edge;
}
