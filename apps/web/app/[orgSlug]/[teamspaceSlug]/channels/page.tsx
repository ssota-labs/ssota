import { Suspense } from "react";
import { ChannelsWorkspace } from "@/components/console/channels-workspace";
import { ChannelsContentLoading } from "@/components/console/browse-content-loading";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getChatWorkspacePort } from "@/lib/ports";

export default function ChannelsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<ChannelsContentLoading />}>
      <ChannelsPageInner params={params} />
    </Suspense>
  );
}

async function ChannelsPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const linked = await getChatWorkspacePort().list(project.id);

  return <ChannelsWorkspace linked={linked} />;
}
