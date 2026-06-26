import { getToolRouterSession } from "@ssota/agent-runtime";
import {
  ConnectorsView,
  type ConnectorConnection,
} from "@/components/connectors/connectors-view";
import { getConnectors } from "@/lib/connect/connectors";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getOrCreateProjectAccount } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function ConnectorsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { org, project } = await resolveProject(orgSlug, projectSlug);
  const user = await getCurrentUser();

  // accountId is threaded through hrefs but is no longer the connector tenancy
  // key — Composio keys connectors by org + profile.
  const account = await getOrCreateProjectAccount(project.id);
  const connectors = getConnectors();

  // Live connection state from the entity's Composio Tool Router session.
  let connections: ConnectorConnection[] = [];
  if (user) {
    const session = await getToolRouterSession({
      orgId: org.id,
      profileId: user.id,
    });
    if (session) {
      const { items } = await session.toolkits();
      connections = items
        .filter((item) => item.connection?.isActive)
        .map((item) => ({
          id: item.connection?.connectedAccount?.id ?? item.slug,
          connector: item.slug,
          name: item.name ?? null,
        }));
    }
  }

  const returnTo = projectPath(ctx, "connectors");

  return (
    <ConnectorsView
      connectors={connectors}
      connections={connections}
      projectId={project.id}
      accountId={account.id}
      returnTo={returnTo}
    />
  );
}
