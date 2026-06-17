import { buildResolvedComponentMap } from "@ssota/studio-renderer";
import type { ResolvedComponentMap } from "@ssota/studio-renderer";
import { getGraphDeps } from "@/lib/graph/graph-deps";

export async function loadResolvedUiComponents(
  projectId: string,
): Promise<ResolvedComponentMap> {
  const { graphRead } = getGraphDeps(projectId);
  const nodes = await graphRead.queryNodes({
    projectId,
    nodeType: "ui_component",
    limit: 200,
  });

  return buildResolvedComponentMap(
    nodes.map((node) => ({
      nodeId: node.id,
      content: node.content,
    })),
  );
}
