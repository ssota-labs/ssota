import {
  enrichConnectInstallationDisplay,
  createVercelConnectProvider,
  getConnectInstallation,
  getDb,
  normalizeConnectInstallationId,
} from "@ssota/agent-runtime";
import {
  connectTokenScopesForConnector,
  inboundConnectTokenScopesForConnector,
} from "@ssota/agent-runtime/connect-scopes";
import {
  createAccountConnectionPort,
  createChatWorkspacePort,
} from "@ssota/adapter-postgres";
import {
  isApiAccountScopeError,
  resolveApiAccountScope,
} from "@/lib/api/resolve-api-account-scope";
import { providerOf } from "@/lib/connect/connectors";

/** Inbound chat routes by platform workspace key (Slack team_id, Discord guild_id). */
const CHAT_PROVIDERS = new Set(["slack", "discord"]);

function scopesForConnector(connector: string): string[] | undefined {
  const platform = providerOf(connector);
  return CHAT_PROVIDERS.has(platform)
    ? inboundConnectTokenScopesForConnector(connector)
    : connectTokenScopesForConnector(connector);
}

async function assertInboundBotTokenReady(input: {
  connector: string;
  teamspaceId: string;
  accountId?: string;
  installationId?: string;
}): Promise<void> {
  const platform = providerOf(input.connector);
  if (!CHAT_PROVIDERS.has(platform)) return;
  if (process.env.CONNECT_STUB === "1") return;

  const provider = createVercelConnectProvider();
  const cred = await provider.getToken(input.connector, {
    teamspaceId: input.teamspaceId,
    accountId: input.accountId,
    installationId: input.installationId,
    connectPurpose: "inbound",
  });

  if (!cred?.token) {
    throw new Error(
      platform === "slack"
        ? "Slack bot is not installed for this workspace. Install the bot in Vercel Connect, then reconnect from Channels."
        : "Discord bot is not installed for this server. Install the bot in Vercel Connect, then reconnect from Channels.",
    );
  }

  if (platform === "slack" && cred.token.startsWith("xoxp")) {
    throw new Error(
      "Slack connected with a user token only. Reconnect from Channels after installing the bot to the workspace.",
    );
  }
}

export interface FinalizeVercelConnectInput {
  connector: string;
  teamspaceId: string;
  accountId?: string;
  userId?: string;
  installationId?: string;
}

export interface FinalizeVercelConnectResult {
  platform?: string;
  workspaceKey?: string;
  recorded: boolean;
  linked: boolean;
}

/**
 * Confirm a Vercel Connect install, persist `account_connections`, and auto-link
 * `chat_workspaces` for Slack/Discord so inbound webhooks route by team/guild id.
 */
export async function finalizeVercelConnect(
  input: FinalizeVercelConnectInput,
): Promise<FinalizeVercelConnectResult> {
  const installationId = normalizeConnectInstallationId(input.installationId);
  const scopes = scopesForConnector(input.connector);

  const installation = await getConnectInstallation(
    input.connector,
    {
      teamspaceId: input.teamspaceId,
      accountId: input.accountId,
      installationId,
      userId: input.userId,
    },
    { scopes },
  );

  if (!installation) {
    return { recorded: false, linked: false };
  }

  if (input.accountId) {
    await assertInboundBotTokenReady({
      connector: input.connector,
      teamspaceId: input.teamspaceId,
      accountId: input.accountId,
      installationId: normalizeConnectInstallationId(
        installation.installationId ?? installationId,
      ),
    });
  }

  let recorded = false;
  let linked = false;
  let workspaceKey: string | undefined;

  if (input.accountId) {
    if (input.userId && input.teamspaceId) {
      try {
        await resolveApiAccountScope(input.teamspaceId, {
          requestedAccountId: input.accountId,
        });
      } catch (error) {
        if (isApiAccountScopeError(error)) {
          throw error;
        }
        throw error;
      }
    }

    const resolvedInstallationId = normalizeConnectInstallationId(
      installation.installationId ?? installationId,
    );
    const enrichedInstallation =
      input.userId != null
        ? await enrichConnectInstallationDisplay({
            connector: input.connector,
            installation: {
              installationId: resolvedInstallationId,
              tenantId: installation.tenantId,
              name: installation.name,
            },
            scope: {
              teamspaceId: input.teamspaceId,
              accountId: input.accountId,
              userId: input.userId,
              ...(resolvedInstallationId
                ? { installationId: resolvedInstallationId }
                : {}),
            },
          })
        : installation;

    await createAccountConnectionPort(getDb()).record({
      teamspaceId: input.teamspaceId,
      accountId: input.accountId,
      connector: input.connector,
      installationId: resolvedInstallationId ?? null,
      tenantId:
        enrichedInstallation.tenantId ?? installation.tenantId ?? null,
      name: enrichedInstallation.name ?? installation.name ?? null,
      subjectUserId: input.userId ?? null,
    });
    recorded = true;

    const platform = providerOf(input.connector);
    workspaceKey =
      enrichedInstallation.tenantId ??
      installation.tenantId ??
      undefined;

    if (
      input.teamspaceId &&
      workspaceKey &&
      CHAT_PROVIDERS.has(platform)
    ) {
      await createChatWorkspacePort(getDb()).link({
        teamspaceId: input.teamspaceId,
        accountId: input.accountId ?? null,
        platform,
        workspaceKey,
        name: enrichedInstallation.name ?? installation.name ?? null,
      });
      linked = true;
    }

    return { platform, workspaceKey, recorded, linked };
  }

  const platform = providerOf(input.connector);
  workspaceKey = installation.tenantId ?? undefined;
  if (input.teamspaceId && workspaceKey && CHAT_PROVIDERS.has(platform)) {
    await createChatWorkspacePort(getDb()).link({
      teamspaceId: input.teamspaceId,
      accountId: null,
      platform,
      workspaceKey,
      name: installation.name ?? null,
    });
    linked = true;
  }

  return { platform, workspaceKey, recorded, linked };
}
