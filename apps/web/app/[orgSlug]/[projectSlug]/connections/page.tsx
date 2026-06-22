import { ConnectionsList } from "@/components/connections/connections-list";
import { getConnectors } from "@/lib/connect/connectors";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import {
  getAccountConnectionPort,
  getOrCreateProjectAccount,
} from "@/lib/ports";

export default async function ConnectionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);

  const account = await getOrCreateProjectAccount(project.id);
  const [connectors, connections] = await Promise.all([
    Promise.resolve(getConnectors()),
    getAccountConnectionPort().list(account.id),
  ]);

  const returnTo = projectPath(ctx, "connections");

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
        projectId={project.id}
        accountId={account.id}
        returnTo={returnTo}
      />
  );
}
