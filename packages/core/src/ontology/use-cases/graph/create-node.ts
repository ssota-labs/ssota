import type { CreateNodeInput, GraphEdits } from "@ssota/contracts/graph";
import { normalizeNodeContentForWrite } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import type { GatePolicySource } from "../../gate/evaluate-gate-policies.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphCommitPort } from "../../ports/action-port.js";
import type { GraphReadPort, GraphWritePort } from "../../ports/graph-read-port.js";
import { commitSystemEdits } from "./system-actions.js";
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
    /** @deprecated runAction 경유로 커밋한다 — 호환을 위해 시그니처에만 남김 */
    graphWrite?: GraphWritePort;
    commit: GraphCommitPort;
    gatePolicies?: GatePolicySource;
  },
  input: CreateNodeInput,
) {
  const catalogRef = await resolveNodeCatalog(deps.catalog, input);

  let validatedProperties: Record<string, unknown>;
  try {
    validatedProperties = await deps.catalog.validateNodeProperties(
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

  // [ACTION-01] runAction 경유 커밋. Gate(before_create_node)는 runAction의 applyEdits가
  // 트랜잭션 안(락 이후)에서 평가하므로 여기서 따로 부르지 않는다.
  // initiativeId/releaseId 부가 엣지는 어댑터 숨은 부수효과였던 것을 명시적 편집으로 올린다.
  const edits: GraphEdits = {
    edits: [
      {
        op: "create_node",
        ref: "node",
        catalogKey: catalogRef.key,
        title: input.title,
        properties: validatedProperties,
        // Gate 경로 표현식은 initiative에서 출발한다 (옛 subjectNodeId: initiativeId 의미 보존)
        ...(input.initiativeId ? { gateSubject: { id: input.initiativeId } } : {}),
      },
      ...(input.initiativeId
        ? [{
            op: "create_edge" as const,
            catalogKey: "for_initiative",
            from: { ref: "node" as const },
            to: { id: input.initiativeId },
            properties: {},
          }]
        : []),
      ...(input.releaseId
        ? [{
            op: "create_edge" as const,
            catalogKey: "for_release",
            from: { ref: "node" as const },
            to: { id: input.releaseId },
            properties: {},
          }]
        : []),
    ],
  };
  const out = await commitSystemEdits(deps, {
    key: "graph.create_node",
    teamspaceId: input.teamspaceId,
    edits,
    lockNodeId: input.initiativeId ?? null,
  });
  const nodeId = out.result.refs.node;
  if (!nodeId) throw new GraphError("PRECONDITION_FAILED", "create_node did not yield a node id");
  const node = await deps.graphRead.getNodeById(nodeId);
  if (!node) throw new GraphError("NOT_FOUND", `created node ${nodeId} not readable`);
  return node;
}
