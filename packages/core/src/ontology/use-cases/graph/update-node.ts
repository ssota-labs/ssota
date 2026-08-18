import type { UpdateNodeInput } from "@ssota/contracts/graph";
import { normalizeNodeContentForWrite } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import {
  runGateOnPassEffects,
  type GatePolicySource,
} from "../../gate/evaluate-gate-policies.js";
import type { GraphCommitPort } from "../../ports/action-port.js";
import { commitSystemEdits } from "./system-actions.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GraphWritePort } from "../../ports/graph-write-port.js";
import { assertGraphNodeInProject } from "../../domain/graph-scope.js";
import type { SpawnTaskDeps } from "../../../agents/use-cases/spawn-task.js";

export async function updateNode(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    /** @deprecated runAction 경유로 커밋한다 */
    graphWrite?: GraphWritePort;
    commit: GraphCommitPort;
    gatePolicies?: GatePolicySource;
    /** Required for onPass spawn_task effects */
    spawn?: SpawnTaskDeps;
  },
  input: UpdateNodeInput,
) {
  const existing = await deps.graphRead.getNode({
    teamspaceId: input.teamspaceId,
    nodeId: input.nodeId,
  });
  assertGraphNodeInProject(input.teamspaceId, existing);

  if (input.properties !== undefined) {
    try {
      await deps.catalog.validateNodeProperties(existing.catalogKey, input.properties);
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

  const nextProperties = persisted.properties ?? existing.properties;

  // [ACTION-01] runAction 경유. Gate(before_update_node)는 applyEdits가 락 이후 평가한다.
  // update_properties는 얕은 병합이므로 nextProperties 전체를 넘겨 기존 replace 의미를 유지한다.
  await commitSystemEdits(deps, {
    key: "graph.update_node",
    teamspaceId: input.teamspaceId,
    edits: { edits: [{
      op: "update_properties", node: { id: input.nodeId },
      properties: nextProperties,
      ...(persisted.title !== undefined ? { title: persisted.title } : {}),
    }] },
    lockNodeId: input.nodeId,
  });
  const updated = await deps.graphRead.getNode({ teamspaceId: input.teamspaceId, nodeId: input.nodeId });
  if (!updated) throw new GraphError("NOT_FOUND", `updated node ${input.nodeId} not readable`);

  if (deps.gatePolicies && deps.spawn) {
    await runGateOnPassEffects(
      {
        graphRead: deps.graphRead,
        gatePolicies: deps.gatePolicies,
        spawn: deps.spawn,
      },
      {
        hook: "before_update_node",
        teamspaceId: input.teamspaceId,
        catalogKey: existing.catalogKey,
        subjectNodeId: existing.id,
        properties: updated.properties,
        previousProperties: existing.properties,
        title: updated.title,
      },
    );
  }

  return updated;
}
