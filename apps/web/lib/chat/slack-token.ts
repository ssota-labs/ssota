import {
  createVercelConnectProvider,
  probeSlackToken,
  resolveConnectTokenSubject,
  type SlackTokenProbe,
} from "@ssota/agent-runtime";
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

function slackTokenDebugEnabled(): boolean {
  return (
    process.env.SLACK_TOKEN_DEBUG === "1" ||
    process.env.CONNECT_TOKEN_DEBUG === "1"
  );
}

function logSlackTokenMint(event: Record<string, unknown>): void {
  if (!slackTokenDebugEnabled()) return;
  console.info(JSON.stringify({ component: "slack-token-mint", ...event }));
}

export type SlackTokenMintDebugStep = {
  step: "app-getToken" | "user-getToken";
  connectSubject: { type: "app" } | { type: "user"; id: string };
  outcome: "token" | "null" | "error";
  tokenPrefix?: string;
  probe?: SlackTokenProbe;
  error?: string;
};

export type SlackTokenMintDebugReport = {
  installationId?: string;
  connector: string;
  teamspaceId: string;
  accountId: string;
  subjectUserId?: string | null;
  connectionRow?: {
    installationId: string | null;
    tenantId: string | null;
    connector: string;
  };
  steps: SlackTokenMintDebugStep[];
  chosen?: { tokenSubject: SlackTokenSubject; tokenPrefix: string };
};

async function probeMintedSlackToken(
  token: string,
): Promise<SlackTokenProbe | undefined> {
  if (!slackTokenDebugEnabled()) return undefined;
  try {
    return await probeSlackToken(token);
  } catch (error) {
    logSlackTokenMint({
      phase: "probe-error",
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

async function tryConnectMint(input: {
  provider: ReturnType<typeof createVercelConnectProvider>;
  connector: string;
  tokenScope: {
    teamspaceId: string;
    accountId: string;
    installationId?: string;
    userId?: string;
    connectPurpose?: "inbound" | "default";
  };
  step: SlackTokenMintDebugStep["step"];
  steps?: SlackTokenMintDebugStep[];
}): Promise<{ token: string; tokenSubject: SlackTokenSubject } | null> {
  const connectSubject = resolveConnectTokenSubject(
    input.connector,
    input.tokenScope,
  );
  logSlackTokenMint({
    phase: "getToken-request",
    step: input.step,
    connector: input.connector,
    connectSubject,
    installationId: input.tokenScope.installationId ?? null,
    userId: input.tokenScope.userId ?? null,
  });

  try {
    const cred = await input.provider.getToken(input.connector, input.tokenScope);
    if (!cred?.token) {
      logSlackTokenMint({
        phase: "getToken-result",
        step: input.step,
        connectSubject,
        outcome: "null",
      });
      input.steps?.push({
        step: input.step,
        connectSubject,
        outcome: "null",
      });
      return null;
    }

    const tokenSubject: SlackTokenSubject = isSlackUserToken(cred.token)
      ? "user"
      : "app";
    const probe = await probeMintedSlackToken(cred.token);
    logSlackTokenMint({
      phase: "getToken-result",
      step: input.step,
      connectSubject,
      outcome: "token",
      tokenPrefix: probe?.tokenPrefix ?? (tokenSubject === "user" ? "xoxp" : "xoxb"),
      authTest: probe?.authTest,
    });
    input.steps?.push({
      step: input.step,
      connectSubject,
      outcome: "token",
      tokenPrefix: probe?.tokenPrefix,
      probe,
    });
    return { token: cred.token, tokenSubject };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logSlackTokenMint({
      phase: "getToken-error",
      step: input.step,
      connectSubject,
      error: message,
    });
    input.steps?.push({
      step: input.step,
      connectSubject,
      outcome: "error",
      error: message,
    });
    return null;
  }
}

async function mintSlackBotToken(input: {
  teamspaceId: string;
  accountId: string;
  installationId?: string;
  connectorUid?: string;
  debugSteps?: SlackTokenMintDebugStep[];
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
    connectPurpose: "inbound" as const,
  };

  logSlackTokenMint({
    phase: "start",
    connector,
    installationId: installationId ?? null,
    teamspaceId: input.teamspaceId,
    accountId: input.accountId,
    subjectUserId: slackScope?.subjectUserId ?? null,
    connectionInstallationId: slackScope?.installationId ?? null,
    connectionTenantId: slackScope?.tenantId ?? null,
  });

  const appMinted = await tryConnectMint({
    provider,
    connector,
    tokenScope,
    step: "app-getToken",
    steps: input.debugSteps,
  });
  if (appMinted && !isSlackUserToken(appMinted.token)) {
    cacheSlackTokenSubject(installationId, appMinted.tokenSubject);
    return appMinted;
  }

  logSlackTokenMint({
    phase: "complete",
    connector,
    installationId: installationId ?? null,
    outcome: appMinted ? "user-token-rejected" : "no-token",
  });
  return null;
}

/** Diagnostic report for why inbound Slack mint chose app vs user token. */
export async function debugMintSlackBotTokenForInstallation(
  installationId: string,
): Promise<SlackTokenMintDebugReport | null> {
  if (usesStaticSlackToken()) {
    const token = staticSlackToken();
    return token
      ? {
          installationId,
          connector: "(static SLACK_BOT_TOKEN)",
          teamspaceId: "",
          accountId: "",
          steps: [],
          chosen: {
            tokenSubject: token.startsWith("xoxp") ? "user" : "app",
            tokenPrefix: token.startsWith("xoxp") ? "xoxp" : "xoxb",
          },
        }
      : null;
  }

  const db = getDb();
  const link = await createChatWorkspacePort(db).resolve(installationId);
  const teamspaceId = link?.teamspaceId ?? process.env.CHAT_PROJECT_ID;
  if (!teamspaceId) return null;

  const accountId =
    link?.accountId ?? (await getOrCreateProjectAccount(teamspaceId)).id;

  const accountConnections = createAccountConnectionPort(db);
  const scopes = await accountConnections.listConnectCredentialScopes(accountId);
  const slackScope = pickSlackScope(scopes, installationId);
  const connector = slackScope?.connector ?? defaultSlackConnectorUid();
  const steps: SlackTokenMintDebugStep[] = [];

  const minted = await mintSlackBotToken({
    teamspaceId,
    accountId,
    installationId,
    connectorUid: defaultSlackConnectorUid(),
    debugSteps: steps,
  });

  const report: SlackTokenMintDebugReport = {
    installationId,
    connector,
    teamspaceId,
    accountId,
    subjectUserId: slackScope?.subjectUserId ?? null,
    connectionRow: slackScope
      ? {
          connector: slackScope.connector,
          installationId: slackScope.installationId,
          tenantId: slackScope.tenantId,
        }
      : undefined,
    steps,
    chosen: minted
      ? {
          tokenSubject: minted.tokenSubject,
          tokenPrefix: minted.token.startsWith("xoxp") ? "xoxp" : "xoxb",
        }
      : undefined,
  };

  console.info(JSON.stringify({ component: "slack-token-mint-report", ...report }));
  return report;
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
