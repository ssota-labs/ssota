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
      typeof node.properties.method === "string"
        ? node.properties.method
        : "—",
  }));
}

export default async function ResearchUserPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const nodes = await queryNodesByType(project.id, "user_research");
  const revalidatePath = projectPath(ctx, "research", "user");

  async function createUserResearch() {
    "use server";
    await createGraphNodeAction({
      projectId: project.id,
      catalogKey: "user_research",
      title: `User research ${new Date().toISOString().slice(0, 10)}`,
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <GraphListPage
      columns={[
        { accessorKey: "title", header: "Title" },
        { accessorKey: "status", header: "Method" },
      ]}
      data={toRows(nodes)}
      newLabel="New user research"
      emptyTitle="No user research yet"
      emptyDescription="Create the first user research entry."
      onCreate={createUserResearch}
    />
  );
}
