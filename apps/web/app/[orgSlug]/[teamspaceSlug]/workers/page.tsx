import { Suspense } from "react";
import { WorkersWorkspace } from "@/components/console/workers-workspace";
import { WorkersContentLoading } from "@/components/console/browse-content-loading/workers-content-loading";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getWorkerPort } from "@/lib/ports";

export default function WorkersPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<WorkersContentLoading />}>
      <WorkersPageInner params={params} />
    </Suspense>
  );
}

async function WorkersPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const workers = await getWorkerPort(project.id).listWorkers();

  return (
    <WorkersWorkspace
      orgSlug={orgSlug}
      teamspaceSlug={teamspaceSlug}
      teamspaceId={project.id}
      initialWorkers={workers}
    />
  );
}
