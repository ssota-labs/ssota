import { EvergreenDocumentRoute } from "@/components/console/evergreen-document-route";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function DevIntegrationPage({
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
      nodeType="integration_spec"
      defaultTitle="Integration"
      revalidateSegments={["development", "integration"]}
      emptyDescription="Document integration contracts and flows."
    />
  );
}
