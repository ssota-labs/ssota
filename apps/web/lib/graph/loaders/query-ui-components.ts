import { getGraphDeps } from "@/lib/graph/graph-deps";

export type UiComponentListRow = {
  id: string;
  title: string;
  slug: string;
  tier: string;
  status: string;
  updatedAt: string;
};

export async function queryUiComponents(
  projectId: string,
): Promise<UiComponentListRow[]> {
  const { graphRead } = getGraphDeps(projectId);
  const nodes = await graphRead.queryNodes({
    projectId,
    nodeType: "ui_component",
    limit: 200,
  });

  return nodes
    .map((node) => {
      const props = node.properties as {
        slug?: string;
        tier?: string;
      };
      return {
        id: node.id,
        title: node.title || "Untitled",
        slug: props.slug ?? node.id.slice(0, 8),
        tier: props.tier ?? "primitive",
        status: node.content ? "Published" : "Draft",
        updatedAt: node.updatedAt.toISOString(),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
