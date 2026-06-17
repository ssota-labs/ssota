import { EvergreenDocumentRoute } from "@/components/console/evergreen-document-route";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function DesignUiComponentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);

  return (
    <EvergreenDocumentRoute
      projectId={project.id}
      ctx={ctx}
      nodeType="ui_component_catalog"
      defaultTitle="UI components"
      revalidateSegments={["design", "ui-components"]}
      emptyDescription="Document the UI component catalog."
    />
  );
}
