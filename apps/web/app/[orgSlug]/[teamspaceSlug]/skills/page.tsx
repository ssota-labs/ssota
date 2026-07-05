import { Suspense } from "react";
import { SkillsPageWorkspace } from "@/components/console/skills-workspace";
import { SkillsContentLoading } from "@/components/console/browse-content-loading";
import { loadSkillsForUi } from "@/lib/console/load-skills-for-ui";
import { resolveOrg } from "@/lib/console/resolve-project";

export default function SkillsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<SkillsContentLoading />}>
      <SkillsPageInner params={params} />
    </Suspense>
  );
}

async function SkillsPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const initialSkills = await loadSkillsForUi(project.id);

  return (
    <div className="relative min-h-0 flex-1">
      <SkillsPageWorkspace
        teamspaceId={project.id}
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        initialLibrarySkills={initialSkills}
      />
    </div>
  );
}
