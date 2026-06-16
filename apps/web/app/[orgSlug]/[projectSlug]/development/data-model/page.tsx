import { EvergreenDocumentRoute } from "@/components/console/evergreen-document-route";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function DevDataModelPage({
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
      nodeType="data_spec"
      defaultTitle="Data model"
      revalidateSegments={["development", "data-model"]}
      emptyDescription="Document the canonical data model in markdown."
    />
  );
}
