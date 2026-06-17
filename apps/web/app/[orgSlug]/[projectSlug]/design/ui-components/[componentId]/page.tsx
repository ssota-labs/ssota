import { notFound } from "next/navigation";
import { StudioShell } from "@/components/console/design-studio/studio-shell";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";

export default async function DesignUiComponentEditorPage({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    componentId: string;
  }>;
}) {
  const { orgSlug, projectSlug, componentId } = await params;
  const ctx: ProjectRouteContext = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const { graphRead } = getGraphDeps(project.id);
  const component = await graphRead.getNode({
    projectId: project.id,
    nodeId: componentId,
  });

  if (!component || component.nodeType !== "ui_component") {
    notFound();
  }

  const theme = await ensureEvergreenSingleton(
    project.id,
    "design_theme",
    "Design theme",
  );
  const previewPath = `${projectPath(ctx, "design", "preview")}?mode=draft`;
  const editorPath = projectPath(ctx, "design", "ui-components", componentId);

  async function saveDraft(input: {
    projectId: string;
    nodeId: string;
    draft: string;
    revalidatePath: string;
  }) {
    "use server";
    const deps = getGraphDeps(input.projectId);
    const existing = await deps.graphRead.getNode({
      projectId: input.projectId,
      nodeId: input.nodeId,
    });
    if (!existing) {
      throw new Error("Component not found");
    }

    await updateGraphNodeAction({
      projectId: input.projectId,
      nodeId: input.nodeId,
      properties: {
        ...existing.properties,
        draft: input.draft,
      },
      revalidatePaths: [editorPath],
    });
  }

  return (
    <StudioShell
      ctx={ctx}
      projectId={project.id}
      component={component}
      themeContent={theme.content ?? ""}
      previewPath={previewPath}
      onSaveDraft={saveDraft}
    />
  );
}
