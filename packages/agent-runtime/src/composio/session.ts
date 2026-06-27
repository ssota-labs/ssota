/**
 * Composio Tool Router session helpers. A session per entity exposes Composio's
 * native tool search + execute meta-tools and the authorize/list/disconnect
 * flows used by the Connectors UI.
 *
 * Two entity scopes:
 *  - user (`org_<id>__user_<id>`): the acting user's personal connections.
 *  - org  (`org_<id>`): org-shared connections, created as `accountType: SHARED`
 *    with an ACL of the org's members so every member's session can use them.
 */
import { getComposioClient } from "./client.js";
import {
  composioOrgUserId,
  composioUserId,
  getSessionToolkitSlugs,
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

export interface OrgToolRouterSessionInput {
  orgId: string;
  callbackUrl?: string;
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
 * Toolkit slugs Composio reports as un-auto-creatable in a 400, e.g.
 * "...cannot be auto-created: twitter, foo." So we can drop them and retry
 * instead of failing the whole session (and losing every connector).
 */
function parseUnconfigurableToolkits(error: unknown): string[] {
  const text = error instanceof Error ? error.message : String(error);
  const match = text.match(/cannot be auto-created:\s*([a-z0-9_,\s]+)/i);
  const list = match?.[1];
  if (!list) return [];
  return list
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function createSessionForEntity(
  userId: string,
  opts: { callbackUrl?: string; disabledTools?: Record<string, string[]> },
) {
  const composio = getComposioClient();
  if (!composio) return null;
  const tools = toolsConfig(opts.disabledTools);
  // Per-toolkit BYOA: slugs present here use our own auth config; absent
  // slugs fall back to Composio-managed auth.
  const authConfigs = resolveComposioAuthConfigs();
  const manageConnections = opts.callbackUrl
    ? { enable: true, callbackUrl: opts.callbackUrl }
    : true;
  let toolkits = getSessionToolkitSlugs();

  // Resilient: if Composio 400s because a toolkit has no managed auth config and
  // can't auto-create one, drop those toolkits and retry so the rest still work.
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await composio.toolRouter.create(userId, {
        toolkits,
        authConfigs,
        ...(tools ? { tools } : {}),
        manageConnections,
      });
    } catch (error) {
      const bad = parseUnconfigurableToolkits(error);
      const next = toolkits.filter((t) => !bad.includes(t));
      if (
        bad.length === 0 ||
        next.length === toolkits.length ||
        next.length === 0 ||
        attempt >= 2
      ) {
        throw error;
      }
      toolkits = next;
    }
  }
}

/**
 * Tool Router session for the acting user (org + profile). Returns null when
 * Composio is not configured so callers degrade to no connectors.
 */
export async function getToolRouterSession(input: ToolRouterSessionInput) {
  return createSessionForEntity(
    composioUserId({ orgId: input.orgId, profileId: input.profileId }),
    { callbackUrl: input.callbackUrl, disabledTools: input.disabledTools },
  );
}

/** Tool Router session for the org-shared entity (`org_<id>`). */
export async function getOrgToolRouterSession(input: OrgToolRouterSessionInput) {
  return createSessionForEntity(composioOrgUserId(input.orgId), {
    callbackUrl: input.callbackUrl,
    disabledTools: input.disabledTools,
  });
}

/**
 * Authorize a toolkit as an org-shared (SHARED) connection: created under the
 * org entity with an ACL of the member user entities, so every member's
 * personal session can use it. Kept here (not in web) so the Composio
 * `experimental` authorize options resolve against @composio/core directly.
 */
export async function authorizeOrgSharedToolkit(input: {
  orgId: string;
  toolkit: string;
  callbackUrl: string;
  /** Composio user entity ids granted access (built from org members). */
  memberUserIds: string[];
}): Promise<{ redirectUrl: string | null }> {
  const session = await getOrgToolRouterSession({
    orgId: input.orgId,
    callbackUrl: input.callbackUrl,
  });
  if (!session) return { redirectUrl: null };
  // ToolRouterSession.authorize accepts an `experimental` block for SHARED + ACL
  // at runtime; the exported `Session` return-type alias omits it, so type the
  // call explicitly here.
  type SharedAuthorize = {
    authorize(
      toolkit: string,
      options: {
        callbackUrl?: string;
        experimental?: {
          accountType?: "SHARED" | "PRIVATE";
          aclConfigForShared?: { userId: string[] };
        };
      },
    ): Promise<{ redirectUrl: string | null }>;
  };
  const connection = await (session as unknown as SharedAuthorize).authorize(
    input.toolkit,
    {
      callbackUrl: input.callbackUrl,
      experimental: {
        accountType: "SHARED",
        ...(input.memberUserIds.length > 0
          ? { aclConfigForShared: { userId: input.memberUserIds } }
          : {}),
      },
    },
  );
  return { redirectUrl: connection.redirectUrl ?? null };
}

export interface ComposioConnection {
  toolkit: string;
  connectedAccountId: string;
  active: boolean;
}

/**
 * List a Composio entity's connected accounts (one per connected toolkit).
 * Used to render per-scope connection state in the Connectors UI.
 */
export async function listComposioConnections(
  userId: string,
): Promise<ComposioConnection[]> {
  const composio = getComposioClient();
  if (!composio) return [];
  const res = await composio.connectedAccounts.list({ userIds: [userId] });
  const items =
    (res as { items?: unknown[] }).items ??
    (Array.isArray(res) ? (res as unknown[]) : []);
  return (
    items as Array<{
      id: string;
      status?: string;
      toolkit?: { slug?: string } | string;
    }>
  ).map((item) => {
    const toolkit =
      typeof item.toolkit === "string" ? item.toolkit : (item.toolkit?.slug ?? "");
    return {
      toolkit,
      connectedAccountId: item.id,
      active: item.status === "ACTIVE",
    };
  });
}

/**
 * Disconnect (delete) a Composio connected account by id. Used by the
 * Connectors page's disconnect action. No-op when Composio is unconfigured.
 */
export async function disconnectComposioAccount(
  connectedAccountId: string,
): Promise<void> {
  const composio = getComposioClient();
  if (!composio) return;
  await composio.connectedAccounts.delete(connectedAccountId);
}
