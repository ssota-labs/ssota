/**
 * Composio Tool Router session helper. One session per entity (org+profile)
 * exposes a single MCP endpoint with Composio's native tool search + execute
 * meta-tools, plus the authorize flow used by the web Connections page. This
 * replaces our hand-rolled MCP/REST connectors, BM25 tool search, and the
 * Vercel Connect credential machinery.
 */
import { getComposioClient } from "./client.js";
import {
  composioUserId,
  getComposioToolkitSlugs,
  resolveComposioAuthConfigs,
} from "./shared.js";

export interface ToolRouterSessionInput {
  orgId: string;
  profileId: string;
  /** Where Composio returns the user after a connect flow (web authorize route). */
  callbackUrl?: string;
  /**
   * Per-toolkit disabled tool slugs — excluded from the session
   * (`tools: { <toolkit>: { disable } }`). Sourced from connector_tool_settings.
   */
  disabledTools?: Record<string, string[]>;
}

/** Build the Tool Router `tools` config from per-toolkit disabled slugs. */
function toolsConfig(
  disabledTools: Record<string, string[]> | undefined,
): Record<string, { disable: string[] }> | undefined {
  if (!disabledTools) return undefined;
  const entries = Object.entries(disabledTools).filter(
    ([, slugs]) => slugs.length > 0,
  );
  if (entries.length === 0) return undefined;
  return Object.fromEntries(
    entries.map(([toolkit, slugs]) => [toolkit, { disable: slugs }]),
  );
}

/**
 * Create a Tool Router session for the entity. Returns null when Composio is
 * not configured (`COMPOSIO_API_KEY` unset) so callers degrade to no connectors.
 */
export async function getToolRouterSession(input: ToolRouterSessionInput) {
  const composio = getComposioClient();
  if (!composio) return null;

  const userId = composioUserId({ orgId: input.orgId, profileId: input.profileId });
  const tools = toolsConfig(input.disabledTools);
  return composio.toolRouter.create(userId, {
    toolkits: getComposioToolkitSlugs(),
    // Per-toolkit BYOA: slugs present here use our own auth config; absent
    // slugs fall back to Composio-managed auth.
    authConfigs: resolveComposioAuthConfigs(),
    ...(tools ? { tools } : {}),
    manageConnections: input.callbackUrl
      ? { enable: true, callbackUrl: input.callbackUrl }
      : true,
  });
}

/**
 * Disconnect (delete) a Composio connected account by id. Used by the
 * Connections page's disconnect action. No-op when Composio is unconfigured.
 */
export async function disconnectComposioAccount(
  connectedAccountId: string,
): Promise<void> {
  const composio = getComposioClient();
  if (!composio) return;
  await composio.connectedAccounts.delete(connectedAccountId);
}
