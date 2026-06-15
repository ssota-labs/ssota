import type { GraphNode } from "@ssota/core";
import { getGraphDeps } from "../graph-deps";

export type RecentActivityItem = {
  id: string;
  nodeType: string;
  title: string;
  updatedAt: string;
};

export async function getRecentGraphActivity(
  projectId: string,
  limit = 8,
): Promise<RecentActivityItem[]> {
  const { graphRead } = getGraphDeps(projectId);
  const nodes = await graphRead.queryNodes({ projectId, limit: 50 });

  return [...nodes]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit)
    .map((node: GraphNode) => ({
      id: node.id,
      nodeType: node.nodeType,
      title: node.title || "Untitled",
      updatedAt: node.updatedAt.toISOString(),
    }));
}
