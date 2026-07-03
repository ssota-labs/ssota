import { createVercelConnectProvider } from "@ssota/agent-runtime";
import {
  createAccountConnectionPort,
  createChatWorkspacePort,
  type ConnectCredentialScopeRecord,
} from "@ssota/adapter-postgres";
import { getDb } from "@ssota/agent-runtime";
import { getOrCreateProjectAccount } from "@/lib/ports";

function slackProviderOfConnectorUid(connectorUid: string): string {
  return connectorUid.split("/")[0] ?? connectorUid;
}

function defaultSlackConnectorUid(): string {
  return (
    process.env.SLACK_CONNECT_CONNECTOR ??
    process.env.SLACK_MCP_CONNECTOR ??
    "slack"
  );
}

function usesStaticSlackToken(): boolean {
  return (
    process.env.SLACK_CONNECT === "0" || Boolean(process.env.SLACK_BOT_TOKEN)
  );
}

function staticSlackToken(): string | null {
  return process.env.SLACK_BOT_TOKEN ?? null;
}

function slackScopeMatchesInstallation(
  scope: ConnectCredentialScopeRecord,
  installationId: string,
): boolean {
  return (
    scope.installationId === installationId || scope.tenantId === installationId
  );
}

function pickSlackScope(
  scopes: ConnectCredentialScopeRecord[],
  installationId?: string,
): ConnectCredentialScopeRecord | undefined {
  const slackScopes = scopes.filter(
    (scope) => slackProviderOfConnectorUid(scope.connector) === "slack",
  );
  if (slackScopes.length === 0) return undefined;
  if (!installationId) return slackScopes[0];
  return (
    slackScopes.find((scope) => slackScopeMatchesInstallation(scope, installationId)) ??
    slackScopes[0]
  );
}

async function mintSlackBotToken(input: {
  teamspaceId: string;
  accountId: string;
  installationId?: string;
  connectorUid?: string;
}): Promise<string | null> {
  const db = getDb();
  const accountConnections = createAccountConnectionPort(db);
  const scopes = await accountConnections.listConnectCredentialScopes(
    input.accountId,
  );
  const slackScope = pickSlackScope(scopes, input.installationId);
  if (!slackScope && !input.connectorUid) return null;

  const connector = slackScope?.connector ?? input.connectorUid!;
  const installationId =
    input.installationId ??
    slackScope?.installationId ??
    slackScope?.tenantId ??
    undefined;

  const provider = createVercelConnectProvider();
  const cred = await provider.getToken(connector, {
    teamspaceId: input.teamspaceId,
    accountId: input.accountId,
    installationId,
  });
  return cred?.token ?? null;
}

/**
 * Resolve a Slack bot token for an inbound webhook installation id (Slack team_id).
 * Uses `chat_workspaces` + `account_connections` so production does not depend on
 * `CHAT_PROJECT_ID` or a bare `slack` connector uid.
 */
export async function getSlackBotTokenForInstallation(
  installationId: string,
): Promise<string | null> {
  if (usesStaticSlackToken()) {
    return staticSlackToken();
  }

  const db = getDb();
  const link = await createChatWorkspacePort(db).resolve(installationId);
  const teamspaceId = link?.teamspaceId ?? process.env.CHAT_PROJECT_ID;
  if (!teamspaceId) return null;

  const accountId =
    link?.accountId ?? (await getOrCreateProjectAccount(teamspaceId)).id;

  return mintSlackBotToken({
    teamspaceId,
    accountId,
    installationId,
    connectorUid: defaultSlackConnectorUid(),
  });
}

export async function getSlackBotTokenForTeamspace(
  teamspaceId: string,
  workspaceKey?: string,
): Promise<string | null> {
  if (usesStaticSlackToken()) {
    return staticSlackToken();
  }

  const db = getDb();
  const workspaces = await createChatWorkspacePort(db).list(teamspaceId);
  const slackWorkspace =
    workspaces.find(
      (row) =>
        row.platform === "slack" &&
        (!workspaceKey || row.workspaceKey === workspaceKey),
    ) ?? workspaces.find((row) => row.platform === "slack");

  const account = await getOrCreateProjectAccount(teamspaceId);

  return mintSlackBotToken({
    teamspaceId,
    accountId: account.id,
    installationId: slackWorkspace?.workspaceKey ?? workspaceKey,
    connectorUid: defaultSlackConnectorUid(),
  });
}
