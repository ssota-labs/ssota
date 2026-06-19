import { notFound, redirect } from "next/navigation";
import { StudioShell } from "@/components/console/design-studio/studio-shell";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { slugifyComponentTitle } from "@/lib/design-studio/tree-utils";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { deployUiComponentAction } from "@/lib/graph/actions/deploy-ui-component";
import { resolveProjectTheme } from "@/lib/design-studio/resolve-project-theme";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { queryUiComponents } from "@/lib/graph/loaders/query-ui-components";
import { defaultSourceComponentProperties } from "@/lib/design-studio/empty-document";

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
  const studioBasePath = projectPath(ctx, "design", "ui-components");
  const previewBasePath = projectPath(ctx, "design", "preview");

  const { tokens: themeTokens, themeCss } = await resolveProjectTheme(
    project.id,
  );

  let component = null;
  if (componentId) {
    const { graphRead } = getGraphDeps(project.id);
    component = await graphRead.getNode({
      projectId: project.id,
      nodeId: componentId,
    });
    if (!component || component.catalogKey !== "ui_component") {
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
      catalogKey: "ui_component",
      title,
      properties: defaultSourceComponentProperties(slug),
      revalidatePaths: [studioBasePath],
    });
    redirect(projectPath(ctx, "design", "ui-components", node.id));
  }

  async function deployComponent(input: {
    projectId: string;
    nodeId: string;
    contentV2?: import("@ssota/contracts/catalog").UiComponentContentV2;
    revalidatePath: string;
  }) {
    "use server";
    await deployUiComponentAction({
      projectId: input.projectId,
      nodeId: input.nodeId,
      contentV2: input.contentV2,
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
      themeTokens={themeTokens}
      themeCss={themeCss}
      previewBasePath={previewBasePath}
      onDeploy={deployComponent}
      onCreateComponent={createComponent}
    />
  );
}
