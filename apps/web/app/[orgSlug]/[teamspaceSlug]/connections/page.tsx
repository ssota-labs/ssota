import { Suspense } from "react";
import {
  composioOrgUserId,
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
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getOrCreateProjectAccount } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

const toConnection = (c: ComposioConnection): ConnectorConnection => ({
  id: c.connectedAccountId,
  connector: c.toolkit,
  name: null,
});

export default function ConnectionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<ConnectorsContentLoading />}>
      <ConnectionsPageInner params={params} />
    </Suspense>
  );
}

async function ConnectionsPageInner({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const ctx = { orgSlug, teamspaceSlug };
  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);
  const user = await getCurrentUser();

  const account = await getOrCreateProjectAccount(project.id);
  const connectors = getConnectors();

  let userConns: ComposioConnection[] = [];
  let orgConns: ComposioConnection[] = [];
  if (user) {
    [userConns, orgConns] = await Promise.all([
      listComposioConnections(
        composioUserId({ orgId: org.id, profileId: user.id }),
      ),
      listComposioConnections(composioOrgUserId(org.id)),
    ]);
  }

  const returnTo = orgPath(ctx, "connections");

  return (
    <ConnectorsView
      connectors={connectors}
      connections={{
        user: userConns.filter((c) => c.active).map(toConnection),
        org: orgConns.filter((c) => c.active).map(toConnection),
      }}
      teamspaceId={project.id}
      accountId={account.id}
      returnTo={returnTo}
      allowOrgScope
    />
  );
}
