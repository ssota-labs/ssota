import type { CreateInitiativeBundleInput } from "@ssota/contracts/graph";
import { GraphError } from "../../domain/graph-errors.js";
import type { CreateInitiativeBundleResult } from "../../domain/graph-types.js";
import type { GraphCommitPort } from "../../ports/action-port.js";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphReadPort, GraphWritePort } from "../../ports/graph-read-port.js";
import { commitSystemEdits } from "./system-actions.js";

/**
 * [ACTION-01] runAction 경유. 어댑터가 자체 db.transaction으로 하던 "initiative + release + paired_with"를
 * GraphEdits 3편집 배치로 올린다 — 같은 원자성에 검증·Gate·감사가 더해진다.
 */
export async function createInitiativeBundle(
  deps: {
    catalog: CatalogReadPort;
    graphRead: GraphReadPort;
    /** @deprecated */
    graphWrite?: GraphWritePort;
    commit: GraphCommitPort;
  },
  input: CreateInitiativeBundleInput,
): Promise<CreateInitiativeBundleResult> {
  const out = await commitSystemEdits(deps, {
    key: "graph.create_initiative_bundle",
    teamspaceId: input.teamspaceId,
    edits: { edits: [
      { op: "create_node", ref: "initiative", catalogKey: "initiative", title: input.initiativeTitle,
        properties: { lifecycleStatus: "Draft", ...(input.initiativeProperties ?? {}) } },
      { op: "create_node", ref: "release", catalogKey: "release", title: input.releaseVersion,
        properties: { lifecycleStatus: "Draft", ...(input.releaseProperties ?? {}) } },
      { op: "create_edge", ref: "paired", catalogKey: "paired_with",
        from: { ref: "initiative" }, to: { ref: "release" }, properties: {} },
    ] },
  });
  const { initiative, release, paired } = out.result.refs;
  if (!initiative || !release || !paired) {
    throw new GraphError("PRECONDITION_FAILED", "initiative bundle did not yield all ids");
  }
  return { initiativeId: initiative, releaseId: release, pairedWithEdgeId: paired };
}
