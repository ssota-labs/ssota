import type { NodeType } from "@ssota/contracts";
import type { GraphNode } from "@ssota/core";
import { createNode } from "@ssota/core";
import { queryInitiativeScopedNodes } from "./query-initiative-scoped";
import { getGraphDeps } from "../graph-deps";

export async function ensureInitiativeScopedNode(
  projectId: string,
  initiativeId: string,
  nodeType: NodeType,
  defaultTitle: string,
): Promise<GraphNode> {
  const existing = await queryInitiativeScopedNodes(
    projectId,
    initiativeId,
    nodeType,
  );
  if (existing[0]) return existing[0];

  const deps = getGraphDeps(projectId);
  return createNode(deps, {
    projectId,
    catalogKey: nodeType,
    title: defaultTitle,
    properties: { lifecycleStatus: "Draft" },
    initiativeId,
  });
}
