import { extractUiComponentFiles } from "@ssota/contracts/catalog";
import { getGraphDeps } from "@/lib/graph/graph-deps";

export type PublishedUiComponentRow = {
  id: string;
  title: string;
  slug: string;
  tier: string;
};

export async function queryPublishedUiComponents(
  teamspaceId: string,
): Promise<PublishedUiComponentRow[]> {
  const { graphRead } = getGraphDeps(teamspaceId);
  const nodes = await graphRead.queryNodes({
    teamspaceId,
    catalogKey: "ui_component",
    limit: 200,
  });

  return nodes
    .filter((node) => {
      const files = extractUiComponentFiles(node.properties);
      return files !== null && Object.keys(files).length > 0;
    })
    .map((node) => {
      const props = node.properties as { slug?: string; tier?: string };
      return {
        id: node.id,
        title: node.title || "Untitled",
        slug: props.slug ?? node.id.slice(0, 8),
        tier: props.tier ?? "primitive",
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
