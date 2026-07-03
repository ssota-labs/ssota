import {
  createVercelConnectProvider,
} from "@ssota/agent-runtime";
import {
  createAccountConnectionPort,
  createChatWorkspacePort,
} from "@ssota/adapter-postgres";
import { getDb } from "@ssota/agent-runtime";
import { getOrCreateProjectAccount } from "@/lib/ports";

function slackProviderOfConnectorUid(connectorUid: string): string {
  return connectorUid.split("/")[0] ?? connectorUid;
}

export async function getSlackBotTokenForTeamspace(
  teamspaceId: string,
  workspaceKey?: string,
): Promise<string | null> {
  const db = getDb();
  const connectorUid =
    process.env.SLACK_CONNECT_CONNECTOR ?? process.env.SLACK_MCP_CONNECTOR ?? "slack";
  const staticToken = process.env.SLACK_BOT_TOKEN;
  if (process.env.SLACK_CONNECT === "0" || staticToken) {
    return staticToken ?? null;
  }

  const workspaces = await createChatWorkspacePort(db).list(teamspaceId);
  const slackWorkspace =
    workspaces.find(
      (row) =>
        row.platform === "slack" &&
        (!workspaceKey || row.workspaceKey === workspaceKey),
    ) ?? workspaces.find((row) => row.platform === "slack");

  const accountConnections = createAccountConnectionPort(db);
  const account = await getOrCreateProjectAccount(teamspaceId);
  const scopes = await accountConnections.listConnectCredentialScopes(account.id);
  const slackScope = scopes.find(
    (scope) => slackProviderOfConnectorUid(scope.connector) === "slack",
  );
  if (!slackScope) return null;

  const installationId =
    slackWorkspace?.workspaceKey ??
    slackScope.installationId ??
    slackScope.tenantId ??
    undefined;

  const provider = createVercelConnectProvider();
  const cred = await provider.getToken(slackScope.connector, {
    teamspaceId,
    installationId: installationId ?? undefined,
  });
  return cred?.token ?? null;
}
