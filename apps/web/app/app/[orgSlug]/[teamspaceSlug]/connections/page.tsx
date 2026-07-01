import { Suspense } from "react";
import {
  composioUserId,
  listComposioConnections,
  type ComposioConnection,
} from "@ssota/agent-runtime";
import {
  ConnectorsView,
  type ConnectorConnection,
} from "@/components/connectors/connectors-view";
import { ConnectorsContentLoading } from "@/components/console/browse-content-loading";
import { getConnectors } from "@/lib/connect/connectors";
import { appProjectPath } from "@/lib/console/app-paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { resolveEndUserContext } from "@/lib/request-context";

const toConnection = (c: ComposioConnection): ConnectorConnection => ({
  id: c.connectedAccountId,
  connector: c.toolkit,
  name: null,
});

export default function AppConnectionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<ConnectorsContentLoading />}>
      <AppConnectionsPageInner params={params} />
    </Suspense>
  );
}

async function AppConnectionsPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const ctx = await resolveEndUserContext(orgSlug, teamspaceSlug);
  const { org } = await resolveOrg(orgSlug, teamspaceSlug);
  const routeCtx = { orgSlug, teamspaceSlug };

  const connectors = getConnectors();

  const userConns = await listComposioConnections(
    composioUserId({ orgId: org.id, profileId: ctx.userId }),
  );

  const returnTo = appProjectPath(routeCtx, "connections");

  return (
    <ConnectorsView
      connectors={connectors}
      connections={{
        user: userConns.filter((c) => c.active).map(toConnection),
        org: [],
      }}
      teamspaceId={ctx.teamspaceId}
      accountId={ctx.accountId}
      returnTo={returnTo}
      allowOrgScope={false}
    />
  );
}
