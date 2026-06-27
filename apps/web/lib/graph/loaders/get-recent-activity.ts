import type { GraphNode } from "@ssota/core";
import { getGraphDeps } from "../graph-deps";

export type RecentActivityItem = {
  id: string;
  nodeType: string;
  title: string;
  updatedAt: string;
};

export async function getRecentGraphActivity(
  teamspaceId: string,
  limit = 8,
): Promise<RecentActivityItem[]> {
  const { graphRead } = getGraphDeps(teamspaceId);
  const nodes = await graphRead.queryNodes({ teamspaceId, limit: 50 });

  return [...nodes]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit)
    .map((node: GraphNode) => ({
      id: node.id,
      nodeType: node.catalogKey,
      title: node.title || "Untitled",
      updatedAt: node.updatedAt.toISOString(),
    }));
}
