import { ComponentListPage } from "@/components/console/design-studio/component-list-page";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { slugifyComponentTitle } from "@/lib/design-studio/tree-utils";
import { createGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { queryUiComponents } from "@/lib/graph/loaders/query-ui-components";
import { redirect } from "next/navigation";

export default async function DesignUiComponentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const rows = await queryUiComponents(project.id);
  const listPath = projectPath(ctx, "design", "ui-components");
  const editorBasePath = listPath;

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
      revalidatePaths: [listPath],
    });
    redirect(`${listPath}/${node.id}`);
  }

  return (
    <ComponentListPage
      rows={rows}
      editorBasePath={editorBasePath}
      onCreate={createComponent}
    />
  );
}
