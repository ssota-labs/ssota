import type { NodeType } from "@ssota/contracts";
import type { GraphNode } from "@ssota/core";
import { createNode } from "@ssota/core";
import { getEvergreenSingleton } from "./get-evergreen-singleton";
import { getGraphDeps } from "../graph-deps";

export async function ensureEvergreenSingleton(
  projectId: string,
  nodeType: NodeType,
  defaultTitle: string,
): Promise<GraphNode> {
  const existing = await getEvergreenSingleton(projectId, nodeType);
  if (existing) return existing;

  const deps = getGraphDeps(projectId);
  return createNode(deps, {
    projectId,
    nodeType,
    title: defaultTitle,
    properties: {},
    lifecycleStatus: "Draft",
  });
}
