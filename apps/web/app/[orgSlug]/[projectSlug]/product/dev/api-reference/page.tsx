import { EvergreenDocumentRoute } from "@/components/console/evergreen-document-route";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function DevApiReferencePage({
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
      nodeType="api_reference"
      defaultTitle="API reference"
      revalidateSegments={["product", "dev", "api-reference"]}
      emptyDescription="Document the living API reference."
    />
  );
}
