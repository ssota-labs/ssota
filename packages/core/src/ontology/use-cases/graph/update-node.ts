import type { UpdateNodeInput } from "@ssota/contracts/graph";
import { normalizeNodeContentForWrite } from "@ssota/contracts";
import { GraphError } from "../../domain/graph-errors.js";
import {
  evaluateGatePolicies,
  runGateOnPassEffects,
  type GatePolicySource,
} from "../../gate/evaluate-gate-policies.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort } from "../../ports/graph-read-port.js";
import type { GraphWritePort } from "../../ports/graph-write-port.js";
import { assertGraphNodeInProject } from "../../domain/graph-scope.js";
import type { SpawnTaskDeps } from "../../../agents/use-cases/spawn-task.js";

export async function updateNode(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    graphWrite: GraphWritePort;
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
  const nextTitle = persisted.title ?? existing.title;

  if (deps.gatePolicies) {
    await evaluateGatePolicies(
      { graphRead: deps.graphRead, gatePolicies: deps.gatePolicies },
      {
        hook: "before_update_node",
        teamspaceId: input.teamspaceId,
        catalogKey: existing.catalogKey,
        subjectNodeId: existing.id,
        properties: nextProperties,
        previousProperties: existing.properties,
        title: nextTitle,
      },
    );
  }

  const updated = await deps.graphWrite.updateNode(persisted);

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
