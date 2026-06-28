import { getGraphPorts } from "@/lib/ports";

export type InitiativeOption = {
  id: string;
  title: string;
};

export async function listInitiatives(teamspaceId: string): Promise<InitiativeOption[]> {
  const { graphRead } = getGraphPorts(teamspaceId);
  const nodes = await graphRead.queryNodes({
    teamspaceId,
    catalogKey: "initiative",
    limit: 100,
  });

  return [...nodes]
    .map((node) => ({
      id: node.id,
      title: node.title?.trim() || "Untitled initiative",
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function initiativeExists(
  teamspaceId: string,
  initiativeId: string,
): Promise<boolean> {
  const { graphRead } = getGraphPorts(teamspaceId);
  const nodes = await graphRead.queryNodes({
    teamspaceId,
    catalogKey: "initiative",
    limit: 100,
  });
  return nodes.some((node) => node.id === initiativeId);
}
