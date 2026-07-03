import {
  enrichConnectInstallationDisplay,
  getConnectInstallation,
  getDb,
  normalizeConnectInstallationId,
} from "@ssota/agent-runtime";
import { connectTokenScopesForConnector } from "@ssota/agent-runtime/connect-scopes";
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
  const scopes = connectTokenScopesForConnector(input.connector);

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
