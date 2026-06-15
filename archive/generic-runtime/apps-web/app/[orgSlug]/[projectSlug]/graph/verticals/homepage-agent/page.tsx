import { HomepageAgentVerticalView } from "@/components/graph/homepage-agent-vertical";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function HomepageAgentVerticalPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  return (
    <HomepageAgentVerticalView
      ctx={{ orgSlug, projectSlug }}
      projectId={project.id}
    />
  );
}
