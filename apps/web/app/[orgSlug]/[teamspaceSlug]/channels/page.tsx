import { ChannelsWorkspace } from "@/components/console/channels-workspace";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getChatWorkspacePort } from "@/lib/ports";

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const linked = await getChatWorkspacePort().list(project.id);

  return (
    <div className="relative min-h-0 flex-1">
      <ChannelsWorkspace linked={linked} />
    </div>
  );
}
