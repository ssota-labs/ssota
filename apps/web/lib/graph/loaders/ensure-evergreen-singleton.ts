import type { NodeType } from "@ssota/contracts";
import type { GraphNode } from "@ssota/core";
import { createNode } from "@ssota/core";
import { ensureProjectCatalog } from "@/lib/graph/ensure-project-catalog";
import { getEvergreenSingleton } from "./get-evergreen-singleton";
import { getGraphDeps } from "../graph-deps";

export async function ensureEvergreenSingleton(
  projectId: string,
  nodeType: NodeType,
  defaultTitle: string,
): Promise<GraphNode> {
  const existing = await getEvergreenSingleton(projectId, nodeType);
  if (existing) return existing;

  await ensureProjectCatalog(projectId);
  const deps = getGraphDeps(projectId);
  return createNode(deps, {
    projectId,
    catalogKey: nodeType,
    title: defaultTitle,
    properties: { lifecycleStatus: "Draft" },
  });
}
