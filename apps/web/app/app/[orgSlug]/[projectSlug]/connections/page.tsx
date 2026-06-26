import { getToolRouterSession } from "@ssota/agent-runtime";
import {
  ConnectorsView,
  type ConnectorConnection,
} from "@/components/connectors/connectors-view";
import { getConnectors } from "@/lib/connect/connectors";
import { appProjectPath } from "@/lib/console/app-paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { resolveEndUserContext } from "@/lib/request-context";

export default async function AppConnectionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const { org } = await resolveProject(orgSlug, projectSlug);
  const routeCtx = { orgSlug, projectSlug };

  const connectors = getConnectors();

  // Live per-end-user connections (Composio entity = org + this user).
  let connections: ConnectorConnection[] = [];
  const session = await getToolRouterSession({
    orgId: org.id,
    profileId: ctx.userId,
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

  const returnTo = appProjectPath(routeCtx, "connections");

  return (
    <ConnectorsView
      connectors={connectors}
      connections={connections}
      projectId={ctx.projectId}
      accountId={ctx.accountId}
      returnTo={returnTo}
    />
  );
}
