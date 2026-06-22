import { ConnectionsList } from "@/components/connections/connections-list";
import { getConnectors } from "@/lib/connect/connectors";
import { appProjectPath } from "@/lib/console/app-paths";
import { resolveEndUserContext } from "@/lib/request-context";
import { getAccountConnectionPort } from "@/lib/ports";

export default async function AppConnectionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const routeCtx = { orgSlug, projectSlug };

  const [connectors, connections] = await Promise.all([
    Promise.resolve(getConnectors()),
    getAccountConnectionPort().list(ctx.accountId),
  ]);

  const returnTo = appProjectPath(routeCtx, "connections");

  return (
    <ConnectionsList
        connectors={connectors}
        connections={connections.map((c) => ({
          id: c.id,
          connector: c.connector,
          installationId: c.installationId,
          tenantId: c.tenantId,
          name: c.name,
        }))}
        projectId={ctx.projectId}
        accountId={ctx.accountId}
        returnTo={returnTo}
      />
  );
}
