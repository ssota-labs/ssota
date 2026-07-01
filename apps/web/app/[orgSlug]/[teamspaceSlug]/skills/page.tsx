import { SkillsPageWorkspace } from "@/components/console/skills-workspace";
import { resolveOrg } from "@/lib/console/resolve-project";

export default async function SkillsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);

  return (
    <div className="relative min-h-0 flex-1">
      <SkillsPageWorkspace
        teamspaceId={project.id}
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
      />
    </div>
  );
}
