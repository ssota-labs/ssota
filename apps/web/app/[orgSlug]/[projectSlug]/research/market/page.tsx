import { GraphListPage, type GraphListRow } from "@/components/console/graph-list-page";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { queryNodesByType } from "@/lib/graph/graph-deps";

function toRows(
  nodes: Awaited<ReturnType<typeof queryNodesByType>>,
): GraphListRow[] {
  return nodes.map((node) => ({
    id: node.id,
    title: node.title || "Untitled",
    status:
      typeof node.properties.source === "string"
        ? node.properties.source
        : "—",
  }));
}

export default async function ResearchMarketPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const nodes = await queryNodesByType(project.id, "market_research");
  const revalidatePath = projectPath(ctx, "research", "market");

  async function createMarketResearch() {
    "use server";
    await createGraphNodeAction({
      projectId: project.id,
      nodeType: "market_research",
      title: `Market research ${new Date().toISOString().slice(0, 10)}`,
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <GraphListPage
      columns={[
        { accessorKey: "title", header: "Title" },
        { accessorKey: "status", header: "Source" },
      ]}
      data={toRows(nodes)}
      newLabel="New market research"
      emptyTitle="No market research yet"
      emptyDescription="Create the first market research entry."
      onCreate={createMarketResearch}
    />
  );
}
