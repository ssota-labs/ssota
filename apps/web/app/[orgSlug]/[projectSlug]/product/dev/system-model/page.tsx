import { EvergreenDocumentRoute } from "@/components/console/evergreen-document-route";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function DevSystemModelPage({
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
      nodeType="architecture_spec"
      defaultTitle="System model"
      revalidateSegments={["product", "dev", "system-model"]}
      emptyDescription="Document the platform system architecture."
    />
  );
}
