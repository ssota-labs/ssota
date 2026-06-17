import { DesignStudioPage } from "@/components/console/design-studio/design-studio-page";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
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
  const components = await queryUiComponents(project.id);

  if (components.length > 0) {
    const preferred =
      components.find((row) => row.slug === "demo-button") ?? components[0]!;
    redirect(projectPath(ctx, "design", "ui-components", preferred.id));
  }

  return (
    <DesignStudioPage orgSlug={orgSlug} projectSlug={projectSlug} />
  );
}
