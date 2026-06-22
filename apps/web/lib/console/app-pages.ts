import { pageRuntimeDefinitionSchema } from "@ssota/contracts";
import { getGraphPorts } from "@/lib/ports";

export type AppPageLink = {
  routeKey: string;
  label: string;
};

export async function listAppPageLinks(projectId: string): Promise<AppPageLink[]> {
  const { graphRead } = getGraphPorts(projectId);
  const nodes = await graphRead.queryNodes({ projectId, catalogKey: "page" });
  const links: AppPageLink[] = [];

  for (const node of nodes) {
    const raw = node.properties.definition;
    if (!raw || typeof raw !== "object") continue;
    const parsed = pageRuntimeDefinitionSchema.safeParse(raw);
    if (!parsed.success) continue;
    links.push({
      routeKey: parsed.data.routeKey,
      label: node.title?.trim() || parsed.data.routeKey,
    });
  }

  return [...links].sort((a, b) => a.label.localeCompare(b.label));
}
