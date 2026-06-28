import type { NodeType } from "@ssota/contracts";
import type { GraphNode } from "@ssota/core";
import { createNode } from "@ssota/core";
import { queryInitiativeScopedNodes } from "./query-initiative-scoped";
import { getGraphDeps } from "../graph-deps";

export async function ensureInitiativeScopedNode(
  teamspaceId: string,
  initiativeId: string,
  nodeType: NodeType,
  defaultTitle: string,
): Promise<GraphNode> {
  const existing = await queryInitiativeScopedNodes(
    teamspaceId,
    initiativeId,
    nodeType,
  );
  if (existing[0]) return existing[0];

  const deps = await getGraphDeps(teamspaceId);
  return createNode(deps, {
    teamspaceId,
    catalogKey: nodeType,
    title: defaultTitle,
    properties: { lifecycleStatus: "Draft" },
    initiativeId,
  });
}
