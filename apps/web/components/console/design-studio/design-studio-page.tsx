import { notFound, redirect } from "next/navigation";
import { StudioShell } from "@/components/console/design-studio/studio-shell";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { slugifyComponentTitle } from "@/lib/design-studio/tree-utils";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { deployUiComponentAction } from "@/lib/graph/actions/deploy-ui-component";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";
import { loadResolvedUiComponents } from "@/lib/design-studio/load-resolved-components";
import { queryUiComponents } from "@/lib/graph/loaders/query-ui-components";

type DesignStudioPageProps = {
  orgSlug: string;
  projectSlug: string;
  componentId?: string;
};

export async function DesignStudioPage({
  orgSlug,
  projectSlug,
  componentId,
}: DesignStudioPageProps) {
  const ctx: ProjectRouteContext = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const components = await queryUiComponents(project.id);
  const resolvedComponents = await loadResolvedUiComponents(project.id);
  const studioBasePath = projectPath(ctx, "design", "ui-components");
  const previewPath = `${projectPath(ctx, "design", "preview")}?mode=draft`;

  const theme = await ensureEvergreenSingleton(
    project.id,
    "design_theme",
    "Design theme",
  );

  let component = null;
  if (componentId) {
    const { graphRead } = getGraphDeps(project.id);
    component = await graphRead.getNode({
      projectId: project.id,
      nodeId: componentId,
    });
    if (!component || component.nodeType !== "ui_component") {
      notFound();
    }
  }

  const editorPath = componentId
    ? projectPath(ctx, "design", "ui-components", componentId)
    : studioBasePath;

  async function createComponent() {
    "use server";
    const title = `Component ${new Date().toISOString().slice(0, 10)}`;
    const slug = `${slugifyComponentTitle(title)}-${Date.now().toString(36).slice(-4)}`;
    const node = await createGraphNodeAction({
      projectId: project.id,
      nodeType: "ui_component",
      title,
      properties: {
        slug,
        tier: "primitive",
      },
      revalidatePaths: [studioBasePath],
    });
    redirect(projectPath(ctx, "design", "ui-components", node.id));
  }

  async function deployComponent(input: {
    projectId: string;
    nodeId: string;
    document: import("@ssota/contracts/catalog").UiComponentDocument;
    revalidatePath: string;
  }) {
    "use server";
    await deployUiComponentAction({
      projectId: input.projectId,
      nodeId: input.nodeId,
      document: input.document,
      revalidatePaths: [editorPath],
    });
  }

  return (
    <StudioShell
      ctx={ctx}
      projectId={project.id}
      component={component}
      components={components}
      studioBasePath={studioBasePath}
      themeContent={theme.content ?? ""}
      previewPath={previewPath}
      resolvedComponents={resolvedComponents}
      onDeploy={deployComponent}
      onCreateComponent={createComponent}
    />
  );
}
