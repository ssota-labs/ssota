import type { NodeType } from "@ssota/contracts";
import type { GraphNode } from "@ssota/core";
import { createNode } from "@ssota/core";
import { ensureProjectCatalog } from "@/lib/graph/ensure-project-catalog";
import { getEvergreenSingleton } from "./get-evergreen-singleton";
import { getGraphDeps } from "../graph-deps";

export async function ensureEvergreenSingleton(
  teamspaceId: string,
  nodeType: NodeType,
  defaultTitle: string,
): Promise<GraphNode> {
  const existing = await getEvergreenSingleton(teamspaceId, nodeType);
  if (existing) return existing;

  await ensureProjectCatalog(teamspaceId);
  const deps = await getGraphDeps(teamspaceId);
  return createNode(deps, {
    teamspaceId,
    catalogKey: nodeType,
    title: defaultTitle,
    properties: { lifecycleStatus: "Draft" },
  });
}
