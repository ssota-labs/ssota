import { NextResponse } from "next/server";
import { getConnectInstallation, getDb } from "@ssota/agent-runtime";
import {
  createAccountConnectionPort,
  createChatWorkspacePort,
} from "@ssota/adapter-postgres";
import { providerOf, resolveAuthorizeScopes } from "@/lib/connect/connectors";

export const runtime = "nodejs";

/**
 * Providers whose Connect install also identifies a chat workspace we route
 * inbound @mentions for. The Connect `tenantId` is the same id inbound
 * webhooks carry (Slack `team_id`, Discord `guild_id`), so installing from a
 * project's Connections page is enough to auto-link the workspace — no manual
 * id entry. Telegram has no Connect flow (static bot token) so it stays manual.
 */
const CHAT_PROVIDERS = new Set(["slack", "discord"]);

/**
 * Vercel Connect return URL. After the user completes the provider flow
 * (install / consent), Connect redirects here. We confirm the connection via
 * `getTokenResponse` (reads the provider's installationId / tenantId / name)
 * and record it on the account, then send the user back to `returnTo`.
 *
 * Connector-agnostic: the same callback handles Slack, GitHub, OAuth, etc.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const connector = url.searchParams.get("connector");
  const accountId = url.searchParams.get("accountId") ?? undefined;
  const projectId =
    url.searchParams.get("projectId") ?? process.env.CHAT_PROJECT_ID ?? "";
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  const userId = url.searchParams.get("userId") ?? undefined;
  // Connect may append the new installation id on the redirect; fall back to
  // the connector's default installation otherwise.
  const installationId =
    url.searchParams.get("installationId") ??
    url.searchParams.get("installation_id") ??
    undefined;

  if (!connector) {
    return NextResponse.json(
      { error: "connector query param is required" },
      { status: 422 },
    );
  }

  const scopes = resolveAuthorizeScopes(
    connector,
    url.searchParams.get("scopes")?.split(",").filter(Boolean),
  );

  try {
    const installation = await getConnectInstallation(
      connector,
      {
        projectId,
        accountId,
        installationId,
        userId,
      },
      { scopes },
    );

    if (accountId && installation) {
      await createAccountConnectionPort(getDb()).record({
        projectId,
        accountId,
        connector,
        installationId: installation.installationId ?? installationId ?? null,
        tenantId: installation.tenantId ?? null,
        name: installation.name ?? null,
        subjectUserId: userId ?? null,
      });
    }

    // Auto-link the chat workspace so inbound @mentions route to this project
    // without the creator ever typing a team/guild id. The tenantId Connect
    // returns is exactly the workspace key inbound webhooks carry.
    const platform = providerOf(connector);
    const workspaceKey = installation?.tenantId ?? undefined;
    if (projectId && workspaceKey && CHAT_PROVIDERS.has(platform)) {
      await createChatWorkspacePort(getDb()).link({
        projectId,
        accountId: accountId ?? null,
        platform,
        workspaceKey,
        name: installation?.name ?? null,
      });
    }

    return NextResponse.redirect(new URL(returnTo, url.origin));
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to finalize connection",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
