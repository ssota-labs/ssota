import { Suspense } from "react";
import { ChannelsWorkspace } from "@/components/console/channels-workspace";
import { ChannelsContentLoading } from "@/components/console/browse-content-loading";
import { loadInboundChannelStatus } from "@/lib/connect/inbound-channel-status";
import { legacyOrgTeamspacePath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getOrCreateProjectAccount } from "@/lib/ports";

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
  const account = await getOrCreateProjectAccount(project.id);
  const channels = await loadInboundChannelStatus(project.id);
  const returnTo = legacyOrgTeamspacePath(
    { orgSlug, teamspaceSlug },
    "channels",
  );

  return (
    <ChannelsWorkspace
      channels={channels}
      teamspaceId={project.id}
      accountId={account.id}
      returnTo={returnTo}
      connectStubEnabled={process.env.CONNECT_STUB === "1"}
    />
  );
}
