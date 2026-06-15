import { GraphDocumentPage } from "@/components/console/graph-document-page";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";

export default async function ExecutiveRoadmapPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const revalidatePath = projectPath(ctx, "executive", "roadmap");

  const productRoadmap = await ensureEvergreenSingleton(
    project.id,
    "product_roadmap",
    "Product roadmap",
  );
  const roadmap = await ensureEvergreenSingleton(
    project.id,
    "roadmap",
    "Engineering roadmap",
  );

  async function saveProductRoadmap(input: { title: string; content: string }) {
    "use server";
    await updateGraphNodeAction({
      projectId: project.id,
      nodeId: productRoadmap.id,
      title: input.title,
      content: input.content,
      revalidatePaths: [revalidatePath],
    });
  }

  async function saveRoadmap(input: { title: string; content: string }) {
    "use server";
    await updateGraphNodeAction({
      projectId: project.id,
      nodeId: roadmap.id,
      title: input.title,
      content: input.content,
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <div className="space-y-8">
      <GraphDocumentPage
        title={productRoadmap.title || "Product roadmap"}
        status={productRoadmap.lifecycleStatus}
        content={productRoadmap.content ?? ""}
        emptyDescription="Add product roadmap content in markdown."
        onSave={saveProductRoadmap}
      />
      <GraphDocumentPage
        title={roadmap.title || "Roadmap"}
        status={roadmap.lifecycleStatus}
        content={roadmap.content ?? ""}
        emptyDescription="Add engineering roadmap content in markdown."
        onSave={saveRoadmap}
      />
    </div>
  );
}
