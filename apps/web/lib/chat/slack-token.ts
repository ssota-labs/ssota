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

export type SlackTokenSubject = "app" | "user";

const tokenSubjectByInstallation = new Map<string, SlackTokenSubject>();

function cacheSlackTokenSubject(
  installationId: string | undefined,
  tokenSubject: SlackTokenSubject,
): void {
  if (installationId) {
    tokenSubjectByInstallation.set(installationId, tokenSubject);
  }
}

export function getCachedSlackTokenSubject(
  installationId: string,
): SlackTokenSubject | undefined {
  return tokenSubjectByInstallation.get(installationId);
}

export function isSlackUserToken(token: string): boolean {
  return token.startsWith("xoxp");
}

export function isSlackNotAllowedTokenTypeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("not_allowed_token_type")) return true;
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (code === "slack_webapi_platform_error" && error && typeof error === "object") {
    const data =
      "data" in error && error.data && typeof error.data === "object"
        ? (error.data as { error?: unknown })
        : undefined;
    return data?.error === "not_allowed_token_type";
  }
  return false;
}

async function mintSlackBotToken(input: {
  teamspaceId: string;
  accountId: string;
  installationId?: string;
  connectorUid?: string;
}): Promise<{ token: string; tokenSubject: SlackTokenSubject } | null> {
  const db = getDb();
  const accountConnections = createAccountConnectionPort(db);
  const scopes = await accountConnections.listConnectCredentialScopes(
    input.accountId,
  );
  const slackScope = pickSlackScope(scopes, input.installationId);
  if (!slackScope && !input.connectorUid) return null;

  const connector = slackScope?.connector ?? input.connectorUid!;
  // Prefer Connect's installation id from account_connections; webhook team_id
  // is only a lookup key and may differ from Connect's installation id.
  const installationId =
    slackScope?.installationId ??
    slackScope?.tenantId ??
    input.installationId ??
    undefined;

  const provider = createVercelConnectProvider();
  const tokenScope = {
    teamspaceId: input.teamspaceId,
    accountId: input.accountId,
    installationId,
  };

  // Inbound bot APIs (streaming, assistant.threads.setStatus) need bot token (xoxb).
  // Connect exposes that via app-subject + installationId after Channels OAuth.
  const appCred = await provider.getToken(connector, tokenScope);
  if (appCred?.token) {
    const tokenSubject: SlackTokenSubject = isSlackUserToken(appCred.token)
      ? "user"
      : "app";
    cacheSlackTokenSubject(installationId, tokenSubject);
    return { token: appCred.token, tokenSubject };
  }

  // Fallback: user-subject grant from Channels OAuth (xoxp — chat.postMessage only).
  const subjectUserId = slackScope?.subjectUserId ?? undefined;
  if (subjectUserId) {
    const userCred = await provider.getToken(connector, {
      ...tokenScope,
      userId: subjectUserId,
    });
    if (userCred?.token) {
      cacheSlackTokenSubject(installationId, "user");
      return { token: userCred.token, tokenSubject: "user" };
    }
  }

  return null;
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

  const minted = await mintSlackBotToken({
    teamspaceId,
    accountId,
    installationId,
    connectorUid: defaultSlackConnectorUid(),
  });
  return minted?.token ?? null;
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

  const minted = await mintSlackBotToken({
    teamspaceId,
    accountId: account.id,
    installationId: slackWorkspace?.workspaceKey ?? workspaceKey,
    connectorUid: defaultSlackConnectorUid(),
  });
  return minted?.token ?? null;
}
