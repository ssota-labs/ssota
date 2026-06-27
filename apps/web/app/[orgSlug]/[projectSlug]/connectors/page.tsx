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
import { getConnectors } from "@/lib/connect/connectors";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getOrCreateProjectAccount } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

const toConnection = (c: ComposioConnection): ConnectorConnection => ({
  id: c.connectedAccountId,
  connector: c.toolkit,
  name: null,
});

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
  // key — Composio keys connectors by org + profile (personal) or org (shared).
  const account = await getOrCreateProjectAccount(project.id);
  const connectors = getConnectors();

  // Live connection state for both scopes: personal (org+profile) and the
  // org-shared entity.
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

  const returnTo = projectPath(ctx, "connectors");

  return (
    <ConnectorsView
      connectors={connectors}
      connections={{
        user: userConns.filter((c) => c.active).map(toConnection),
        org: orgConns.filter((c) => c.active).map(toConnection),
      }}
      projectId={project.id}
      accountId={account.id}
      returnTo={returnTo}
      allowOrgScope
    />
  );
}
